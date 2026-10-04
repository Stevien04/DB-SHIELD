package com.dbshield;
import com.dbshield.domain.model.*;
import com.dbshield.infrastructure.adapter.out.jdbc.SelectedDatabaseConnection;
import com.dbshield.infrastructure.security.ImportedCaSslFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.*;
import java.sql.*;
import java.util.Properties;
import static org.junit.jupiter.api.Assertions.*;

class SslConnectionTest {
    @Test void rejectsInvalidCaAndPrivateKeys() {
        for (String pem : new String[]{"", "not a certificate", "-----BEGIN PRIVATE KEY-----x", "x".repeat(262145)})
            assertThrows(java.security.cert.CertificateException.class, () -> ImportedCaSslFactory.certificates(pem));
    }
    @Test @EnabledIfEnvironmentVariable(named="SSL_TEST_HOST", matches=".+")
    void validatesImportedCaHostnameAndRequiresTls() throws Exception {
        String ca = Files.readString(Path.of("/tls/ca.pem"));
        assertEquals(1, ImportedCaSslFactory.certificates(ca).size());
        assertThrows(java.security.cert.CertificateException.class, () -> ImportedCaSslFactory.certificates(Files.readString(Path.of("/tls/server.crt"))));
        Properties props = new Properties(); props.setProperty("dbshield.ssl.ca", ca);
        assertNotNull(new ImportedCaSslFactory(props).getSupportedCipherSuites());
        var connector = new SelectedDatabaseConnection();
        ReflectionTestUtils.setField(connector, "publicHost", ""); ReflectionTestUtils.setField(connector, "internalHost", "");
        var db = ClientDatabase.builder().host("ssl-db").port(5432).dbName("ssltest").username("ssltest").encryptedPassword("test-only-password").dbType(DbType.POSTGRES).sslEnabled(true).sslCaPem(ca).build();
        try (var connection = connector.open(db); var result = connection.createStatement().executeQuery("SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()")) {
            assertTrue(result.next()); assertTrue(result.getBoolean(1));
        }
        db.setSslCaPem(Files.readString(Path.of("/tls/other.pem")));
        assertThrows(SQLException.class, () -> connector.open(db));
        db.setSslCaPem(ca); db.setHost("wrong-ssl-host");
        assertThrows(SQLException.class, () -> connector.open(db));
        db.setHost("internal-db"); db.setUsername("dbshield_user"); db.setEncryptedPassword("supersecret"); db.setDbName("dbshield");
        assertThrows(SQLException.class, () -> connector.open(db));
    }
}
