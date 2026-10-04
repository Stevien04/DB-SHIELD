package com.dbshield;
import com.dbshield.application.service.DatabaseAccessService;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DbType;
import com.dbshield.infrastructure.adapter.in.web.controller.LiveDamController;
import com.dbshield.infrastructure.adapter.out.jdbc.*;
import com.dbshield.infrastructure.adapter.out.persistence.*;
import com.dbshield.infrastructure.adapter.out.persistence.entity.*;
import com.dbshield.infrastructure.security.ConnectionCredentials;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.security.Principal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RealMonitorTest {
    @Test void credentialsAreEncryptedWithRandomNonce() throws Exception {
        ConnectionCredentials cipher = new ConnectionCredentials("test-secret");
        String one = cipher.encrypt("database-password"), two = cipher.encrypt("database-password");
        assertNotEquals(one, two); assertFalse(one.contains("database-password"));
        assertEquals("database-password", cipher.decrypt(one));
        assertThrows(IllegalStateException.class, () -> new ConnectionCredentials("different").decrypt(one));
    }
    @Test void selectedIdAndOwnershipAreRequired() {
        DatabaseConnectionRepository dbs = mock(DatabaseConnectionRepository.class);
        UserRepository users = mock(UserRepository.class);
        DatabaseAccessService access = new DatabaseAccessService(dbs, users);
        DatabaseConnectionEntity foreign = new DatabaseConnectionEntity(); foreign.setOwner("other");
        when(dbs.findById(7L)).thenReturn(Optional.of(foreign));
        when(users.findByUsername("client")).thenReturn(Optional.empty());
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> access.require("client", 7L, true)).getStatusCode().value());
        when(dbs.findById(99L)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> access.require("client", 99L, true)).getStatusCode().value());
        foreign.setOwner("client"); foreign.setActive(false);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> access.require("client", 7L, true)).getStatusCode().value());
    }
    @Test void controllerUsesSelectedDatabaseAndRejectsWrites() {
        DatabaseAccessService access = mock(DatabaseAccessService.class);
        PersistentClientDatabaseAdapter adapter = mock(PersistentClientDatabaseAdapter.class);
        SelectedDatabaseConnection connector = mock(SelectedDatabaseConnection.class);
        LiveDatabaseMonitor monitor = mock(LiveDatabaseMonitor.class);
        LiveDamController controller = new LiveDamController(access, adapter, connector, monitor);
        Principal user = () -> "client";
        DatabaseConnectionEntity entity = new DatabaseConnectionEntity();
        ClientDatabase selected = ClientDatabase.builder().id(42L).dbName("selected_db").build();
        when(access.require("client", 42L, true)).thenReturn(entity);
        when(adapter.map(entity)).thenReturn(selected);
        when(monitor.getActiveQueries(selected)).thenReturn(List.of());
        assertTrue(controller.events(user, 42L).isEmpty());
        verify(monitor).getActiveQueries(selected);
        assertEquals(406, controller.execute(user, new LiveDamController.QueryRequest(42L, "UPDATE users SET username = 'changed'")).getStatusCode().value());
        assertEquals(406, controller.execute(user, new LiveDamController.QueryRequest(42L, "SELECT 1; DELETE FROM users")).getStatusCode().value());
        assertEquals(406, controller.execute(user, new LiveDamController.QueryRequest(42L, "SELECT 1 UNION SELECT 2")).getStatusCode().value());
        verifyNoInteractions(connector);
    }
    @Test void readonlyTransactionAndResultsUseSelectedConnection() throws Exception {
        DatabaseAccessService access = mock(DatabaseAccessService.class);
        PersistentClientDatabaseAdapter adapter = mock(PersistentClientDatabaseAdapter.class);
        SelectedDatabaseConnection connector = mock(SelectedDatabaseConnection.class);
        DatabaseConnectionEntity entity = new DatabaseConnectionEntity();
        ClientDatabase selected = ClientDatabase.builder().id(5L).dbName("real_db").build();
        when(access.require("client", 5L, true)).thenReturn(entity); when(adapter.map(entity)).thenReturn(selected);
        Connection connection = mock(Connection.class); Statement statement = mock(Statement.class);
        ResultSet result = mock(ResultSet.class); ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(connector.open(selected)).thenReturn(connection); when(connection.createStatement()).thenReturn(statement);
        when(statement.executeQuery("SELECT current_database()")).thenReturn(result);
        when(result.getMetaData()).thenReturn(metadata); when(metadata.getColumnCount()).thenReturn(1);
        when(metadata.getColumnLabel(1)).thenReturn("current_database"); when(result.next()).thenReturn(true, false);
        when(result.getString(1)).thenReturn("real_db");
        var response = new LiveDamController(access, adapter, connector, mock(LiveDatabaseMonitor.class))
            .execute(() -> "client", new LiveDamController.QueryRequest(5L, "SELECT current_database();"));
        assertEquals(200, response.getStatusCode().value()); assertEquals(List.of(List.of("real_db")), response.getBody().get("rows"));
        verify(connection).setReadOnly(true); verify(connection).setAutoCommit(false); verify(connection).rollback();
    }
    @Test void snapshotsFilterByDatabaseAndNeverInventEvents() throws Exception {
        SelectedDatabaseConnection connector = mock(SelectedDatabaseConnection.class);
        Connection connection = mock(Connection.class); PreparedStatement statement = mock(PreparedStatement.class); ResultSet result = mock(ResultSet.class);
        ClientDatabase selected = ClientDatabase.builder().id(1L).dbName("one").dbType(DbType.POSTGRES).build();
        when(connector.open(selected)).thenReturn(connection); when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(result); when(result.next()).thenReturn(false);
        assertTrue(new LiveDatabaseMonitor(connector).getActiveQueries(selected).isEmpty());
        verify(connection).prepareStatement(contains("datname = current_database()"));
        verify(connection).setReadOnly(true);
    }
    @Test void connectionFailureIsReportedInsteadOfEmptyTraffic() throws Exception {
        SelectedDatabaseConnection connector = mock(SelectedDatabaseConnection.class);
        ClientDatabase selected = ClientDatabase.builder().id(1L).dbName("one").dbType(DbType.POSTGRES).build();
        when(connector.open(selected)).thenThrow(new SQLException("unavailable", "08001"));
        assertEquals(502, assertThrows(ResponseStatusException.class, () -> new LiveDatabaseMonitor(connector).getActiveQueries(selected)).getStatusCode().value());
    }
}
