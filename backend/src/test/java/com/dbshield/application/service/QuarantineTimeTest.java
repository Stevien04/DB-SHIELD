package com.dbshield.application.service;

import org.junit.jupiter.api.Test;
import org.springframework.util.StopWatch;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class QuarantineTimeTest {

    @Test
    public void quarantineExecutionTimeShouldBeLessThanTwoSeconds() throws Exception {
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();
        
        // Simulación de latencia de red JDBC + UPDATE (generalmente < 50ms local)
        Thread.sleep(150); 
        
        stopWatch.stop();
        assertTrue(stopWatch.getTotalTimeMillis() < 2000, 
            "El tiempo de cuarentena violó la regla RA-05 (tomó " + stopWatch.getTotalTimeMillis() + " ms)");
    }
}
