import sys
import re

def check_tags(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove JSX comments
    content = re.sub(r'\{\s*/\*.*?\*/\s*\}', '', content, flags=re.DOTALL)
    # Remove fragments <> and </>
    content = content.replace("<>", "<div>").replace("</>", "</div>")
    
    stack = []
    lines = content.split('\n')
    
    line_num = 1
    for line in lines:
        matches = re.finditer(r'<\/?([a-zA-Z0-9]+)[^>]*?>', line)
        for match in matches:
            tag_full = match.group(0)
            tag_name = match.group(1)
            
            # self-closing inside the tag
            if tag_full.endswith('/>'):
                continue
            
            if tag_full.startswith('</'):
                if not stack:
                    print(f"Error: Found closing </{tag_name}> with no open tag at line {line_num}")
                    return
                last = stack.pop()
                if last != tag_name:
                    print(f"Error: Mismatched tag. Expected </{last}>, got </{tag_name}> at line {line_num}: {line.strip()}")
                    return
            else:
                stack.append(tag_name)
        line_num += 1
            
    if stack:
        print(f"Error: Unclosed tags remaining: {stack}")
    else:
        print("Success: Tags are perfectly balanced!")

check_tags('src/pages/admin/Dashboard.jsx')
