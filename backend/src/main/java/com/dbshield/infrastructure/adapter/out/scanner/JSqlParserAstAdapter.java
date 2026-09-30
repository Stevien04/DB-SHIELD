package com.dbshield.infrastructure.adapter.out.scanner;

import com.dbshield.application.port.out.AstAnalyzerPort;
import lombok.extern.slf4j.Slf4j;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JSqlParserAstAdapter implements AstAnalyzerPort {

    @Override
    public boolean containsMaliciousAstPatterns(String sqlRoutine) {
        try {
            // RA-04: Auditoría AST usando JSqlParser
            Statement statement = CCJSqlParserUtil.parse(sqlRoutine);
            String parsedSql = statement.toString().toUpperCase();
            
            // Detección de patrones maliciosos en comandos de sistema operativo y evasión
            if (parsedSql.contains("XP_CMDSHELL") || 
                (parsedSql.contains("COPY") && parsedSql.contains("PROGRAM")) ||
                parsedSql.contains("SYS_EXEC") ||
                parsedSql.contains("INTO OUTFILE") ||
                parsedSql.contains("LOAD_FILE")) {
                log.warn("AST: Detectado comando malicioso en la rutina: {}", parsedSql);
                return true;
            }
            
            return false;
        } catch (Exception e) {
            log.error("Error parseando AST, ejecutando fallback de texto", e);
            String rawSql = sqlRoutine.toUpperCase();
            return rawSql.contains("XP_CMDSHELL") || 
                   (rawSql.contains("COPY") && rawSql.contains("PROGRAM")) ||
                   rawSql.contains("SYS_EXEC");
        }
    }
}
