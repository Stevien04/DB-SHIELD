package com.dbshield;
import com.dbshield.application.service.*;
import com.dbshield.infrastructure.adapter.in.web.controller.*;
import com.dbshield.infrastructure.adapter.out.jdbc.*;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import org.junit.jupiter.api.Test;
import java.sql.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class IntegrationApiTest {
    IntegrationKeyService keys=mock(IntegrationKeyService.class);
    DatabaseAccessService access=mock(DatabaseAccessService.class);
    PersistentClientDatabaseAdapter adapter=mock(PersistentClientDatabaseAdapter.class);
    SelectedDatabaseConnection connector=mock(SelectedDatabaseConnection.class);
    ProxyProtectionController protection=mock(ProxyProtectionController.class);
    IntegrationApiController controller=new IntegrationApiController(keys,access,adapter,connector,protection);
    void enabled(boolean writes) {
        when(keys.authenticate("test",4L)).thenReturn(new IntegrationKeyService.Grant(1,"cliente",4,writes));
        when(protection.protection(any(),eq(4L))).thenReturn(Map.of("enabled",true));
        when(access.require("cliente",4L,true)).thenReturn(new DatabaseConnectionEntity());
    }
    @Test void requiresActiveProxyAndDoesNotFallBackToDirectConnection() throws Exception {
        enabled(false); when(protection.protection(any(),eq(4L))).thenReturn(Map.of("enabled",false));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->controller.execute("test",new IntegrationApiController.QueryRequest(4L,"SELECT 1",List.of())));
        verifyNoInteractions(connector);
    }
    @Test void readOnlyKeyCannotWrite() {
        enabled(false);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->controller.execute("test",new IntegrationApiController.QueryRequest(4L,"DELETE FROM clientes WHERE id=?",List.of(1))));
        verifyNoInteractions(connector);
    }
    @Test void bindsParametersInsteadOfInterpolatingAndCommitsPermittedWrite() throws Exception {
        enabled(true);
        var connection=mock(Connection.class);var statement=mock(PreparedStatement.class);
        when(connection.createStatement()).thenReturn(mock(Statement.class));
        when(connector.open(any())).thenReturn(connection);when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.execute()).thenReturn(false);when(statement.getUpdateCount()).thenReturn(1);
        String input="' OR 1=1; DROP TABLE clientes";
        var result=controller.execute("test",new IntegrationApiController.QueryRequest(4L,"UPDATE clientes SET nombre=? WHERE id=?",List.of(input,10)));
        assertEquals(200,result.getStatusCode().value());
        verify(connection).prepareStatement("UPDATE clientes SET nombre=? WHERE id=?");
        verify(statement).setObject(1,input);verify(statement).setObject(2,10);verify(connection).commit();
    }
    @Test void reportsProxyBlockAndNeverCommits() throws Exception {
        enabled(true);var connection=mock(Connection.class);var statement=mock(PreparedStatement.class);
        when(connection.createStatement()).thenReturn(mock(Statement.class));
        when(connector.open(any())).thenReturn(connection);when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.execute()).thenThrow(new SQLException("DB-Shield bloqueó la consulta","42501"));
        var result=controller.execute("test",new IntegrationApiController.QueryRequest(4L,"SELECT 1 WHERE 1=0 OR 'x'='x'",List.of()));
        assertEquals(406,result.getStatusCode().value());verify(connection).rollback();verify(connection,never()).commit();
    }
    @Test void rejectsScriptsBeforeConnection() throws Exception {
        enabled(true);var result=controller.execute("test",new IntegrationApiController.QueryRequest(4L,"SELECT 1; DELETE FROM clientes",List.of()));
        assertEquals(406,result.getStatusCode().value());verifyNoInteractions(connector);
    }
}
