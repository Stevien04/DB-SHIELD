package com.dbshield.application.port.out;
public interface AstAnalyzerPort {
    // RA-04: Auditora AST para inyecciones / comandos de SO
    boolean containsMaliciousAstPatterns(String sqlRoutine);
}
