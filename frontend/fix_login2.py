import os

file_path = r"D:\BD II PROYECTO\frontend\src\pages\Login.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("name: ''})} style=", "name: ''}) }} style=")
content = content.replace("city: ''})} style=", "city: ''}) }} style=")
content = content.replace("phone: ''})} style=", "phone: ''}) }} style=")
content = content.replace("email: ''})} style=", "email: ''}) }} style=")
content = content.replace("password: ''})} style=", "password: ''}) }} style=")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
