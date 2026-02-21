#Requires -Version 5.1
<#
.SYNOPSIS
    Install GSD Copilot files into a target workspace.

.DESCRIPTION
    Downloads the GSD Copilot release zip from GitHub Releases and installs
    .github/prompts/, .github/agents/, and .github/instructions/ into the
    target workspace without touching non-GSD files.

.PARAMETER WorkspaceDir
    Path to the target workspace. Defaults to the current directory.

.PARAMETER Tag
    Release tag to install (e.g. v1.2.0). Defaults to "latest".

.PARAMETER DryRun
    If specified, prints what would be written without actually writing files.

.PARAMETER Force
    If specified, skips conflict warnings and overrides the downgrade block.
#>
[CmdletBinding()]
param(
    [string]$WorkspaceDir = (Get-Location).Path,
    [string]$Tag = "latest",
    [switch]$DryRun,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Configuration ─────────────────────────────────────────────────────────────
$REPO         = "maitaitime/get-shit-done-github-copilot"
$ASSET_NAME   = "gsd-copilot-*.zip"
$VERSION_FILE = ".github/.gsd-version"
# ──────────────────────────────────────────────────────────────────────────────

# ── 1. Resolve release metadata ───────────────────────────────────────────────
try {
    $headers = @{ "User-Agent" = "gsd-installer" }
    if ($Tag -eq "latest") {
        $apiUrl = "https://api.github.com/repos/$REPO/releases/latest"
    } else {
        $apiUrl = "https://api.github.com/repos/$REPO/releases/tags/$Tag"
    }
    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers
} catch {
    Write-Error "Failed to fetch release metadata from GitHub: $($_.Exception.Message)"
    exit 1
}

$releaseVersion = $release.tag_name.TrimStart('v')
$asset = $release.assets | Where-Object { $_.name -like $ASSET_NAME } | Select-Object -First 1
if (-not $asset) {
    Write-Error "No zip asset found in release $($release.tag_name). Expected asset matching: $ASSET_NAME"
    exit 1
}

# ── 2. Downgrade check ────────────────────────────────────────────────────────
$versionFilePath = Join-Path $WorkspaceDir $VERSION_FILE
$installedVersion = $null
if (Test-Path $versionFilePath) {
    $installedVersion = (Get-Content $versionFilePath -Raw).Trim().TrimStart('v')
}

if ($installedVersion) {
    try {
        $installedVer = [System.Version]$installedVersion
        $targetVer    = [System.Version]$releaseVersion
        if ($installedVer -gt $targetVer) {
            if (-not $Force) {
                Write-Error "Downgrade blocked: installed v$installedVersion → target v$releaseVersion. Use -Force to override."
                exit 1
            } else {
                Write-Host "⚠ Warning: downgrading from v$installedVersion to v$releaseVersion (-Force specified)."
            }
        }
    } catch {
        # Non-semver version string — skip comparison
    }
}

# ── 3. Print install header ───────────────────────────────────────────────────
$modeLabel = if ($DryRun) { "DRY RUN" } else { "normal" }
Write-Host ""
Write-Host "GSD Copilot Installer"
Write-Host ""
Write-Host "  Installing:  $REPO @ $($release.tag_name)"
Write-Host "  Target:      $WorkspaceDir"
Write-Host "  Mode:        $modeLabel"
Write-Host ""

# ── 4. Download and extract ───────────────────────────────────────────────────
$writtenCount  = 0
$overwroteCount = 0
$skippedCount  = 0

if (-not $DryRun) {
    $tmpZip = Join-Path $env:TEMP "gsd-copilot-$($release.tag_name).zip"
    $tmpDir = Join-Path $env:TEMP "gsd-copilot-extract-$($release.tag_name)"

    try {
        Write-Verbose "Downloading $($asset.browser_download_url)..."
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmpZip

        Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
        Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force
    } catch {
        Write-Error "Download/extract failed: $($_.Exception.Message)"
        exit 1
    }

    $srcRoot = Join-Path $tmpDir ".github"
    if (-not (Test-Path $srcRoot)) {
        Write-Error "Extracted zip does not contain a .github/ directory. Unexpected asset structure."
        exit 1
    }

    # ── 5. Install files ──────────────────────────────────────────────────────
    try {
        $files = Get-ChildItem -Recurse -File -Path $srcRoot
        foreach ($src in $files) {
            $rel  = $src.FullName.Substring($srcRoot.Length).TrimStart('\', '/')
            $dest = Join-Path $WorkspaceDir ".github" $rel
            $exists = Test-Path $dest

            if ($exists) {
                if ($Force) {
                    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
                    Copy-Item -Path $src.FullName -Destination $dest -Force
                    Write-Verbose "  Overwritten (--force): .github/$rel"
                } else {
                    Write-Host "  `u{26A0} Overwriting: .github/$rel"
                    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
                    Copy-Item -Path $src.FullName -Destination $dest -Force
                }
                $writtenCount++
                $overwroteCount++
            } else {
                New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
                Copy-Item -Path $src.FullName -Destination $dest -Force
                Write-Verbose "  Written: .github/$rel"
                $writtenCount++
            }
        }
    } catch {
        Write-Error "Install failed writing .github/$rel`: $_"
        exit 1
    }

    # ── 6. Write version marker ───────────────────────────────────────────────
    New-Item -ItemType Directory -Force -Path (Split-Path $versionFilePath) | Out-Null
    Set-Content -Path $versionFilePath -Value $releaseVersion -Encoding UTF8

} else {
    # DryRun: fetch manifest without downloading the zip
    try {
        $headers = @{ "User-Agent" = "gsd-installer" }
        $tmpZip = Join-Path $env:TEMP "gsd-copilot-$($release.tag_name)-dryrun.zip"
        $tmpDir = Join-Path $env:TEMP "gsd-copilot-extract-$($release.tag_name)-dryrun"
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmpZip
        Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
        Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force
        $srcRoot = Join-Path $tmpDir ".github"
        $files = Get-ChildItem -Recurse -File -Path $srcRoot
        foreach ($src in $files) {
            $rel  = $src.FullName.Substring($srcRoot.Length).TrimStart('\', '/')
            $dest = Join-Path $WorkspaceDir ".github" $rel
            $exists = Test-Path $dest
            if ($exists) {
                Write-Host "[DRY-RUN] would overwrite: .github/$rel"
            } else {
                Write-Host "[DRY-RUN] would write: .github/$rel"
            }
        }
        Remove-Item -Force $tmpZip -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Dry-run failed fetching release manifest: $($_.Exception.Message)"
        exit 1
    }
}

# ── 7. Print summary ──────────────────────────────────────────────────────────
Write-Host "──────────────────────────────────────────"
if ($DryRun) {
    Write-Host "No files written (dry run)"
} else {
    Write-Host "Done: $writtenCount written ($overwroteCount overwritten), $skippedCount skipped"
    Write-Host "Version: $VERSION_FILE `u{2192} $releaseVersion"
}
Write-Host "──────────────────────────────────────────"
Write-Host ""

# ── 8. Cleanup temp files ──────────────────────────────────────────────────────
if (-not $DryRun) {
    Remove-Item -Force $tmpZip -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
}

exit 0
