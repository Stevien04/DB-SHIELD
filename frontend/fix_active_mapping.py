import os

file_path = r"D:\BD II PROYECTO\frontend\src\pages\AdminUsers.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix mapping from API
content = content.replace("isActive: u.isActive,", "isActive: u.active !== undefined ? u.active : u.isActive,")

# Fix PUT payload in changeRole
content = content.replace("isActive: user.isActive", "active: user.isActive")

# Fix PUT payload in toggleBan
content = content.replace("isActive: !isBanned", "active: !isBanned")

# Fix PUT payload in saveUserDetails
content = content.replace("isActive: editUser.isActive,", "active: editUser.isActive,")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

# Do the same for AdminDBs.tsx
file_path_dbs = r"D:\BD II PROYECTO\frontend\src\pages\AdminDBs.tsx"
with open(file_path_dbs, "r", encoding="utf-8") as f:
    content_dbs = f.read()

content_dbs = content_dbs.replace("isActive: u.isActive,", "isActive: u.active !== undefined ? u.active : u.isActive,")
# AdminDBs doesn't have changeRole or toggleBan anymore, but just in case
content_dbs = content_dbs.replace("isActive: user.isActive", "active: user.isActive")

with open(file_path_dbs, "w", encoding="utf-8") as f:
    f.write(content_dbs)
