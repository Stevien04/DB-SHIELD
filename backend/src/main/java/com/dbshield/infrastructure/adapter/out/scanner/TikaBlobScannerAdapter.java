package com.dbshield.infrastructure.adapter.out.scanner;

import com.dbshield.application.port.out.BlobScannerPort;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.security.MessageDigest;

@Slf4j
@Component
public class TikaBlobScannerAdapter implements BlobScannerPort {

    private final Tika tika = new Tika();

    @Override
    public boolean scanStreamForMalware(InputStream stream) {
        try {
            // RA-02: Escáner BLOB en memoria (sin archivos temporales)
            String mimeType = tika.detect(stream);
            log.info("Detectado MIME type: {}", mimeType);
            
            // Regla de negocio: si detectamos ejecutables o scripts en BLOBs
            if (mimeType.contains("x-dosexec") || mimeType.contains("javascript") || mimeType.contains("x-sh")) {
                return true; // Es una amenaza
            }
            return false;
        } catch (Exception e) {
            log.error("Error escaneando BLOB", e);
            return true; // Ante la duda, bloqueamos
        }
    }

    @Override
    public String generateHash(InputStream stream) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = stream.read(buffer)) != -1) {
                digest.update(buffer, 0, bytesRead);
            }
            byte[] hashBytes = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Error generando SHA-256", e);
            return "ERROR_HASH";
        }
    }
}
