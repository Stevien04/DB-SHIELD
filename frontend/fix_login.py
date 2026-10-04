import re

file_path = r"D:\BD II PROYECTO\frontend\src\pages\Login.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will use a clean regex to fix the onChange handlers
# Find: onChange={e => { setRegName(e.target.value); setFieldErrors({...fieldErrors, name: ''}) }}
# Or whatever current state is, let's just forcefully replace the broken ones.

# Currently it looks like:
# onChange={e => { setRegName(e.target.value); setFieldErrors({...fieldErrors, name: ''}) }} style={inputStyle} />
# Wait, let me just see the lines from 180 to 230 to be absolutely sure.
