import unittest
from policy import inspect_sql

class PolicyTests(unittest.TestCase):
    def test_client_startup_settings(self):
        for query in ["SET client_encoding TO 'UTF8'", 'SET client_encoding TO "UTF8"',
                      "SET NAMES 'UTF8'", "SET standard_conforming_strings TO on"]:
            with self.subTest(query=query): self.assertIsNone(inspect_sql(query))
        for query in ["SET client_encoding TO 'SQL_ASCII'", "SET client_encoding TO 'WIN1252'",
                      "SET standard_conforming_strings TO off", "RESET client_encoding", "SET ROLE admin"]:
            with self.subTest(query=query): self.assertEqual(inspect_sql(query), 'CAMBIO_SEGURIDAD_NO_PERMITIDO')

    def test_legitimate_business_queries(self):
        for query in ["SELECT * FROM productos WHERE id = $1", "INSERT INTO pedidos(id, total) VALUES($1, $2)",
                      "UPDATE productos SET stock = stock - 1 WHERE id = $1", "DELETE FROM carrito WHERE usuario = $1",
                      "SELECT 'OR 1=1; DROP TABLE pedidos' AS texto", "SELECT * FROM productos WHERE 1=1 AND stock > 0",
                      "BEGIN; SELECT count(*) FROM productos; COMMIT;", "SELECT * FROM productos WHERE id = 1 OR id = 2"]:
            with self.subTest(query=query): self.assertIsNone(inspect_sql(query))

    def test_attack_variations(self):
        for query in ["SELECT * FROM usuarios WHERE nombre = '' OR 1=1", "SELECT * FROM usuarios WHERE id=0 OR 'x'='x'",
                      "SELECT * FROM usuarios WHERE id=0 oR/**/2>1", "SELECT * FROM usuarios WHERE id=0 OR true",
                      "SELECT * FROM usuarios WHERE id=0 OR NOT false", "SELECT 1 UNION SELECT 2",
                      "SELECT pg_catalog.pg_sleep(5)", "SELECT pg_read_file('/etc/passwd')",
                      "COPY usuarios TO PROGRAM 'id'", "DO $$BEGIN NULL; END$$", "SELECT 1; DROP TABLE pedidos",
                      "SET client_encoding = 'SQL_ASCII'", "EXECUTE hidden_attack", "DELETE FROM pedidos",
                      "WITH x AS (DELETE FROM pedidos RETURNING *) SELECT * FROM x",
                      "WITH x AS (UPDATE pg_catalog.pg_authid SET rolsuper=true WHERE oid=1 RETURNING *) SELECT * FROM x"]:
            with self.subTest(query=query): self.assertIsNotNone(inspect_sql(query))

if __name__ == '__main__': unittest.main()
