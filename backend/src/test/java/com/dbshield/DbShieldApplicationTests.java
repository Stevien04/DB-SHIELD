package com.dbshield;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DbShieldApplicationTests {

    @Test
    void contextLoads() {
        // Verifica que el contexto de Spring cargue sin errores
    }
}
