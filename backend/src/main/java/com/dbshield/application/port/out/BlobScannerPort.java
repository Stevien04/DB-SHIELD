package com.dbshield.application.port.out;
import java.io.InputStream;
public interface BlobScannerPort {
    // RA-02: Escner BLOB en memoria (sin disco)
    boolean scanStreamForMalware(InputStream stream);
    String generateHash(InputStream stream);
}
