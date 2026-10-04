import re
import os

file_path = r"D:\BD II PROYECTO\frontend\src\pages\AdminUsers.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add locationData constant inside or outside the file
loc_data = """const locationData: Record<string, string[]> = {
    "Perú": ["Lima", "Arequipa", "Cusco", "Piura", "Tacna"],
    "Colombia": ["Bogotá", "Medellín", "Cali", "Cartagena"],
    "Chile": ["Santiago", "Valparaíso", "Concepción"],
    "México": ["CDMX", "Guadalajara", "Monterrey"]
};
"""
content = content.replace("export default function AdminUsers() {", loc_data + "\nexport default function AdminUsers() {")

# 2. Add validation inside saveUserDetails
save_fn = """    const saveUserDetails = async () => {
        if (!editUser) return;
"""
val_code = """    const saveUserDetails = async () => {
        if (!editUser) return;
        
        if (editForm.phone && !/^\d{9}$/.test(editForm.phone)) {
            alert('El teléfono debe tener exactamente 9 dígitos numéricos.');
            return;
        }
"""
content = content.replace(save_fn, val_code)

# 3. Modify Country input to Select
country_input = """<input type="text" value={editForm.country} onChange={(e) => setEditForm({...editForm, country: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: Perú" />"""

country_select = """<select value={editForm.country} onChange={(e) => setEditForm({...editForm, country: e.target.value, city: ''})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }}>
                                    <option value="" disabled>Seleccione un País</option>
                                    {Object.keys(locationData).map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>"""

content = content.replace(country_input, country_select)

# 4. Modify City input to Select
city_input = """<input type="text" value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: Lima" />"""

city_select = """<select value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }} disabled={!editForm.country}>
                                    <option value="" disabled>Seleccione una Ciudad</option>
                                    {editForm.country && locationData[editForm.country] ? locationData[editForm.country].map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    )) : <option value={editForm.city}>{editForm.city}</option>}
                                </select>"""

content = content.replace(city_input, city_select)

# We need to handle the case where the user's existing city/country isn't in the predefined list for backwards compatibility
# The ternary for the city options handles showing the existing city if the country isn't matched. But if the country IS matched, it will force one of the predefined cities.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
