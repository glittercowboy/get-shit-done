#!/usr/bin/env python3
"""
Analyze optimization potential for tiered agents.
"""

import tiktoken
from pathlib import Path

enc = tiktoken.get_encoding("cl100k_base")
base = Path(__file__).parent.parent / "agents"

def tokens(content: str) -> int:
    return len(enc.encode(content))

def analyze_executor():
    original = (base / "gsd-executor.md").read_text()
    core = (base / "gsd-executor-core.md").read_text()
    extended = (base / "gsd-executor-extended.md").read_text()

    print("=" * 75)
    print("EXECUTOR OPTIMIZATION ANALYSIS")
    print("=" * 75)

    print("\n1. CURRENT STATE:")
    print(f"   Original:            {tokens(original):,} tokens")
    print(f"   Core:                {tokens(core):,} tokens")
    print(f"   Extended:            {tokens(extended):,} tokens")
    print(f"   Core + Extended:     {tokens(core) + tokens(extended):,} tokens")
    print(f"   Overhead:            {tokens(core) + tokens(extended) - tokens(original):+,} tokens")

    # Identify what EXTENDED has that CORE doesn't (and should stay)
    print("\n2. EXTENDED-ONLY CONTENT (should keep):")
    extended_only = ['deviation_examples', 'edge_cases', 'anti_patterns']
    keep_tokens = 0
    for section in extended_only:
        if f"<{section}>" in extended:
            import re
            match = re.search(rf'<{section}>(.*?)</{section}>', extended, re.DOTALL)
            if match:
                t = tokens(match.group(0))
                print(f"   {section}: {t:,} tokens")
                keep_tokens += t
    print(f"   Total to keep: {keep_tokens:,} tokens")

    # Identify duplicated content
    print("\n3. DUPLICATED CONTENT (can remove from Extended):")
    duplicated = ['authentication_gates', 'checkpoint_protocol', 'tdd_execution',
                  'continuation_handling', 'checkpoint_types', 'extended_guidance']
    remove_tokens = 0
    for section in duplicated:
        if f"<{section}>" in extended:
            import re
            match = re.search(rf'<{section}>(.*?)</{section}>', extended, re.DOTALL)
            if match:
                t = tokens(match.group(0))
                in_orig = f"<{section}>" in original
                print(f"   {section}: {t:,} tokens (in original: {'yes' if in_orig else 'no'})")
                if in_orig:
                    remove_tokens += t
    print(f"   Total removable: {remove_tokens:,} tokens")

    print("\n4. PROPOSED OPTIMIZATION:")
    print("-" * 50)

    # Option A: Move essential sections to Core, remove from Extended
    print("\n   OPTION A: Clean Extended (remove duplicates)")
    opt_a_core = tokens(core)
    opt_a_ext = tokens(extended) - remove_tokens + 100  # +100 for @-reference header
    print(f"   Core (unchanged):    {opt_a_core:,} tokens")
    print(f"   Extended (trimmed):  {opt_a_ext:,} tokens")
    print(f"   Combined:            {opt_a_core + opt_a_ext:,} tokens")
    print(f"   vs Original:         {opt_a_core + opt_a_ext - tokens(original):+,} tokens")

    # Option B: Merge essential into Core
    print("\n   OPTION B: Move essentials to Core, minimal Extended")
    essential_to_move = 0
    for section in ['authentication_gates', 'tdd_execution']:
        if f"<{section}>" in original:
            import re
            match = re.search(rf'<{section}>(.*?)</{section}>', original, re.DOTALL)
            if match:
                essential_to_move += tokens(match.group(0))

    opt_b_core = tokens(core) + essential_to_move
    opt_b_ext = keep_tokens + 100
    print(f"   Core (expanded):     {opt_b_core:,} tokens")
    print(f"   Extended (minimal):  {opt_b_ext:,} tokens")
    print(f"   Combined:            {opt_b_core + opt_b_ext:,} tokens")
    print(f"   vs Original:         {opt_b_core + opt_b_ext - tokens(original):+,} tokens")

    # Option C: Single file with conditional sections
    print("\n   OPTION C: Back to single file (no tiering)")
    print(f"   Single file:         {tokens(original):,} tokens")
    print(f"   Savings per simple:  0 tokens")
    print(f"   Maintenance files:   1 file")

    print("\n5. RECOMMENDATION:")
    print("-" * 50)
    print("""
   The current Extended file duplicates content that's in Original but
   was removed from Core to save tokens. This defeats the purpose.

   TWO VIABLE PATHS:

   A) FIX THE DUPLICATION (recommended):
      - Extended should ONLY contain examples/edge-cases
      - Core should contain ALL essential sections (condensed)
      - Result: Core ~4K, Extended ~2K, Combined ~6K (vs Original 5K)
      - Trade-off: +1K tokens for complex tasks, -1.7K for simple tasks

   B) ABANDON TIERED APPROACH:
      - Return to single file architecture
      - Focus optimization on workflow/reference files instead
      - Result: No overhead, simpler maintenance
      - Trade-off: No savings from tiered agents
    """)

if __name__ == "__main__":
    analyze_executor()
