package com.dbshield.infrastructure.adapter.out.jdbc;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DbType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

@Component
public class SelectedDatabaseConnection {
    @Value("${DBSHIELD_PUBLIC_HOST:}") private String publicHost;
    @Value("${DBSHIELD_INTERNAL_HOST:}") private String internalHost;
    @Value("${DBSHIELD_PROXY_HOST:}") private String proxyHost = "";

    public Connection open(ClientDatabase db) throws SQLException {
        return open(db, true);
    }
    public Connection openDirect(ClientDatabase db) throws SQLException {
        return open(db, false);
    }
    private Connection open(ClientDatabase db, boolean useProxy) throws SQLException {
        String host = db.getHost();
        int port = db.getPort();
        boolean externalProxy = useProxy && db.getProxyPort() != null && !proxyHost.isBlank();
        if (externalProxy) { host = proxyHost; port = db.getProxyPort(); }
        // Alias explícito del PostgreSQL del propio despliegue; conserva nombre y credenciales seleccionados.
        if (!externalProxy && !internalHost.isBlank() && db.getDbType() == DbType.POSTGRES && db.getPort() == 5432
                && (host.equals("localhost") || host.equals("127.0.0.1") || (!publicHost.isBlank() && host.equals(publicHost)))) host = internalHost;
        String url = (db.getDbType() == DbType.POSTGRES ? "jdbc:postgresql://" : "jdbc:mysql://")
            + host + ":" + port + "/" + db.getDbName();
        Properties properties = new Properties();
        properties.setProperty("user", db.getUsername());
        properties.setProperty("password", db.getEncryptedPassword());
        properties.setProperty("connectTimeout", db.getDbType() == DbType.POSTGRES ? "5" : "5000");
        properties.setProperty("socketTimeout", db.getDbType() == DbType.POSTGRES ? "15" : "15000");
        properties.setProperty("ApplicationName", "DB-Shield DAM");
        if (externalProxy) properties.setProperty("sslmode", "disable"); // Canal interno Docker; el proxy verifica TLS hacia el proveedor.
        else if (db.isSslEnabled()) {
            if (db.getDbType() != DbType.POSTGRES) throw new SQLException("SSL importado solo está disponible para PostgreSQL.");
            properties.setProperty("sslmode", "verify-full");
            properties.setProperty("sslfactory", "com.dbshield.infrastructure.security.ImportedCaSslFactory");
            if (db.getSslCaPem() != null) properties.setProperty("dbshield.ssl.ca", db.getSslCaPem());
        }
        return DriverManager.getConnection(url, properties);
    }
}
