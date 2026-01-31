#!/usr/bin/env python3
"""
Real Token Benchmark using tiktoken
====================================
Uses tiktoken (cl100k_base encoding) to count actual tokens.
While not identical to Anthropic's tokenizer, it uses similar BPE
algorithms and provides accurate relative comparisons.
"""

import tiktoken
from pathlib import Path
import sys

# Use cl100k_base - closest to modern LLM tokenizers
enc = tiktoken.get_encoding("cl100k_base")

def count_tokens(file_path: str) -> dict:
    """Count tokens using tiktoken."""
    path = Path(file_path)
    if not path.exists():
        return {"error": f"File not found: {file_path}"}

    content = path.read_text(encoding='utf-8')
    tokens = enc.encode(content)

    return {
        "file": path.name,
        "path": str(path),
        "tokens": len(tokens),
        "lines": len(content.splitlines()),
        "chars": len(content),
        "tokens_per_line": len(tokens) / max(1, len(content.splitlines()))
    }

def compare_files(file1: str, file2: str, label1: str = "File 1", label2: str = "File 2"):
    """Compare token counts between two files."""
    stats1 = count_tokens(file1)
    stats2 = count_tokens(file2)

    if "error" in stats1 or "error" in stats2:
        return stats1 if "error" in stats1 else stats2

    diff = stats1["tokens"] - stats2["tokens"]
    pct = (diff / stats1["tokens"] * 100) if stats1["tokens"] > 0 else 0

    return {
        label1: stats1,
        label2: stats2,
        "difference": {
            "tokens": diff,
            "percentage": f"{pct:.1f}%",
            "direction": "savings" if diff > 0 else "increase"
        }
    }

def run_benchmark():
    """Run comprehensive benchmark on all agent pairs."""
    base_path = Path(__file__).parent.parent / "agents"

    pairs = [
        ("gsd-executor.md", "gsd-executor-core.md", "Executor"),
        ("gsd-planner.md", "gsd-planner-core.md", "Planner"),
        ("gsd-verifier.md", "gsd-verifier-core.md", "Verifier"),
    ]

    print("=" * 70)
    print("REAL TOKEN BENCHMARK (tiktoken cl100k_base)")
    print("=" * 70)
    print()

    total_original = 0
    total_core = 0

    for original, core, name in pairs:
        orig_path = base_path / original
        core_path = base_path / core

        if not orig_path.exists() or not core_path.exists():
            print(f"⚠️  Skipping {name}: files not found")
            continue

        orig_stats = count_tokens(str(orig_path))
        core_stats = count_tokens(str(core_path))

        diff = orig_stats["tokens"] - core_stats["tokens"]
        pct = (diff / orig_stats["tokens"] * 100)

        print(f"📊 {name}")
        print(f"   Original: {orig_stats['tokens']:,} tokens ({orig_stats['lines']} lines)")
        print(f"   Core:     {core_stats['tokens']:,} tokens ({core_stats['lines']} lines)")
        print(f"   Savings:  {diff:,} tokens ({pct:.1f}%)")
        print()

        total_original += orig_stats["tokens"]
        total_core += core_stats["tokens"]

    # Check for extended files
    print("-" * 70)
    print("EXTENDED FILES (loaded only on retry)")
    print("-" * 70)

    extended_pairs = [
        ("gsd-executor-extended.md", "Executor Extended"),
        ("gsd-planner-extended.md", "Planner Extended"),
        ("gsd-verifier-extended.md", "Verifier Extended"),
    ]

    total_extended = 0
    for ext_file, name in extended_pairs:
        ext_path = base_path / ext_file
        if ext_path.exists():
            stats = count_tokens(str(ext_path))
            print(f"   {name}: {stats['tokens']:,} tokens")
            total_extended += stats["tokens"]

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total Original (3 agents): {total_original:,} tokens")
    print(f"Total Core (3 agents):     {total_core:,} tokens")
    print(f"Savings per simple task:   {total_original - total_core:,} tokens ({(total_original - total_core) / total_original * 100:.1f}%)")
    print()
    print(f"Total Extended (3 agents): {total_extended:,} tokens")
    print(f"Core + Extended combined:  {total_core + total_extended:,} tokens")
    print()

    # Project projections
    print("-" * 70)
    print("PROJECT PROJECTIONS")
    print("-" * 70)
    savings_per_task = total_original - total_core
    print(f"Assuming 60% simple tasks (use core only):")
    print(f"  10 phases × 3 plans = 30 tasks")
    print(f"  18 simple + 12 complex")
    print(f"  Simple savings: 18 × {savings_per_task:,} = {18 * savings_per_task:,} tokens")
    print()

    # Cost calculation (Sonnet pricing)
    cost_per_mtok = 3.0  # $3 per million input tokens
    savings_cost = (18 * savings_per_task) / 1_000_000 * cost_per_mtok
    print(f"Cost savings (Sonnet @ $3/MTok): ${savings_cost:.4f} per 10-phase project")

def main():
    if len(sys.argv) < 2:
        run_benchmark()
    elif sys.argv[1] == "--file" and len(sys.argv) >= 3:
        stats = count_tokens(sys.argv[2])
        print(f"File: {stats.get('file', 'N/A')}")
        print(f"Tokens: {stats.get('tokens', 'N/A'):,}")
        print(f"Lines: {stats.get('lines', 'N/A')}")
    elif sys.argv[1] == "--compare" and len(sys.argv) >= 4:
        result = compare_files(sys.argv[2], sys.argv[3])
        import json
        print(json.dumps(result, indent=2))
    else:
        print("Usage:")
        print("  python3 real_token_benchmark.py           # Run full benchmark")
        print("  python3 real_token_benchmark.py --file <path>")
        print("  python3 real_token_benchmark.py --compare <file1> <file2>")

if __name__ == "__main__":
    main()
