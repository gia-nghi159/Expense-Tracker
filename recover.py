import json

log_path = "/Users/olaadang/.gemini/antigravity-ide/brain/1308e7a8-eaa1-49de-8ada-0b539c8bc42c/.system_generated/logs/transcript_full.jsonl"
last_content = None

with open(log_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "VIEW_FILE" and "GraphDashboard.jsx" in data.get("content", "") and "Total Lines: 516" in data.get("content", ""):
                # We might have viewed it
                pass
            if data.get("type") == "PLANNER_RESPONSE":
                for tc in data.get("tool_calls", []):
                    if tc["name"] in ["write_to_file", "replace_file_content", "multi_replace_file_content"]:
                        if "GraphDashboard.jsx" in str(tc["args"]):
                            # Track edits? Too hard.
                            pass
        except Exception:
            pass

print("Done parsing")
