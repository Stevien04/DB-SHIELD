package com.dbshield.application.port.out;

import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.Threat;

import java.util.List;
import java.util.Map;

public interface ClientDatabasePort {
    List<String> extractTables(ClientDatabase db);
    Map<String, String> extractColumnsWithTypes(ClientDatabase db, String tableName);
    void quarantineRecord(ClientDatabase db, String tableName, String pkColumn, String flagColumn, String pkValue);
    void restoreRecord(ClientDatabase db, String tableName, String pkColumn, String flagColumn, String pkValue);
    void deleteRecord(ClientDatabase db, String tableName, String pkColumn, String pkValue);
    List<Threat> findQuarantinedRecords(ClientDatabase db);
}
