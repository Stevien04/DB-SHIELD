import re
import os

file_path = r"D:\BD II PROYECTO\frontend\src\pages\Login.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add locationData constant
loc_data = """const locationData: Record<string, string[]> = {
    "Perú": ["Lima", "Arequipa", "Cusco", "Piura", "Tacna"],
    "Colombia": ["Bogotá", "Medellín", "Cali", "Cartagena"],
    "Chile": ["Santiago", "Valparaíso", "Concepción"],
    "México": ["CDMX", "Guadalajara", "Monterrey"]
};
"""
content = content.replace("export default function Login() {", loc_data + "\nexport default function Login() {")

# 2. Modify handleRegister validations for Phone
content = content.replace(
"""        const phoneRegex = /^[0-9+\-\s]+$/;
        if (!phoneRegex.test(regPhone)) {
            setErrorMsg('El celular debe contener solo números.');
            return;
        }""",
"""        const phoneRegex = /^\d{9}$/;
        if (!phoneRegex.test(regPhone)) {
            setErrorMsg('El teléfono debe tener exactamente 9 dígitos numéricos.');
            return;
        }"""
)

# 3. Modify UI for Country and City
country_input = """<MapPin size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                    <input type="text" placeholder="País" value={regCountry} onChange={e => setRegCountry(e.target.value)} style={inputStyle} />"""

country_select = """<MapPin size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                    <select value={regCountry} onChange={e => { setRegCountry(e.target.value); setRegCity(''); }} style={{...inputStyle, appearance: 'none', cursor: 'pointer', color: regCountry ? '#000' : '#757575'}}>
                                        <option value="" disabled>País</option>
                                        {Object.keys(locationData).map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>"""

content = content.replace(country_input, country_select)

city_input = """<input type="text" placeholder="Ciudad" value={regCity} onChange={e => setRegCity(e.target.value)} style={{...inputStyle, paddingLeft: '20px'}} />"""

city_select = """<select value={regCity} onChange={e => setRegCity(e.target.value)} style={{...inputStyle, paddingLeft: '20px', appearance: 'none', cursor: 'pointer', color: regCity ? '#000' : '#757575'}} disabled={!regCountry}>
                                        <option value="" disabled>Ciudad</option>
                                        {regCountry && locationData[regCountry]?.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>"""

content = content.replace(city_input, city_select)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
