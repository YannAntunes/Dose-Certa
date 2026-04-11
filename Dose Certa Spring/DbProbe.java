import java.sql.*;

public class DbProbe {
  public static void main(String[] args) throws Exception {
    String url = "jdbc:postgresql://localhost:5432/dose_certa";
    String user = "postgres";
    String pass = "2019";

    try (Connection conn = DriverManager.getConnection(url, user, pass)) {
      System.out.println("Connected: " + !conn.isClosed());

      System.out.println("\n=== medicamentos columns ===");
      try (PreparedStatement ps = conn.prepareStatement(
          "select column_name, data_type, is_nullable " +
          "from information_schema.columns " +
          "where table_schema='public' and table_name='medicamentos' " +
          "order by ordinal_position")) {
        try (ResultSet rs = ps.executeQuery()) {
          while (rs.next()) {
            System.out.printf("- %s (%s) nullable=%s%n",
                rs.getString(1), rs.getString(2), rs.getString(3));
          }
        }
      }

      System.out.println("\n=== medicamentos sample rows (limit 10) ===");
      try (PreparedStatement ps = conn.prepareStatement("select * from medicamentos limit 10")) {
        try (ResultSet rs = ps.executeQuery()) {
          ResultSetMetaData md = rs.getMetaData();
          int n = md.getColumnCount();
          int row = 0;
          while (rs.next()) {
            row++;
            System.out.println("\nRow #" + row);
            for (int i = 1; i <= n; i++) {
              Object v = rs.getObject(i);
              System.out.printf("%s = %s%n", md.getColumnName(i), String.valueOf(v));
            }
          }
          if (row == 0) {
            System.out.println("(no rows)");
          }
        }
      }
    }
  }
}
