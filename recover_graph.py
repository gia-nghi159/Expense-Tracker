import json

log_path = "/Users/olaadang/.gemini/antigravity-ide/brain/1308e7a8-eaa1-49de-8ada-0b539c8bc42c/.system_generated/logs/transcript_full.jsonl"
file_path = "/Users/olaadang/Expense-Tracker/frontend/src/components/GraphDashboard.jsx"

# Reset to HEAD first
import os
os.system(f"git checkout HEAD -- {file_path}")

with open(file_path, "r") as f:
    content = f.read()

with open(log_path, "r") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "PLANNER_RESPONSE":
                for tc in data.get("tool_calls", []):
                    args = tc.get("args", {})
                    if tc["name"] == "write_to_file" and "GraphDashboard.jsx" in args.get("TargetFile", ""):
                        content = args["CodeContent"]
                    elif tc["name"] == "replace_file_content" and "GraphDashboard.jsx" in args.get("TargetFile", ""):
                        target = args.get("TargetContent", "")
                        replacement = args.get("ReplacementContent", "")
                        content = content.replace(target, replacement)
                    elif tc["name"] == "multi_replace_file_content" and "GraphDashboard.jsx" in args.get("TargetFile", ""):
                        chunks = args.get("ReplacementChunks", [])
                        for chunk in chunks:
                            target = chunk.get("TargetContent", "")
                            replacement = chunk.get("ReplacementContent", "")
                            content = content.replace(target, replacement)
        except Exception as e:
            pass

with open(file_path, "w") as f:
    f.write(content)

print("Recovered!")
