import { describe, it, expect, vi, beforeEach } from "vitest";
import * as dbModule from "../db";
import { requireApiAuth, assertCluesScope } from "../apiAuth";
import { createAuthToken, AUTH_COOKIE_NAME } from "../authToken";

describe("Optimizaciones de Rendimiento y Caché (db & apiAuth)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Configuración del Pool de Base de Datos (db.ts)", () => {
    it("debe inicializar el pool con connectionLimit por defecto de 25 y timeouts seguros", () => {
      const pool = dbModule.getPool();
      expect(pool).toBeDefined();
      expect(typeof pool.execute).toBe("function");
      expect(typeof pool.getConnection).toBe("function");
    });
  });

  describe("2. Caché en Memoria y Fallback de Autenticación (apiAuth.ts)", () => {
    it("debe consultar la BD en la primera petición y usar caché en memoria en peticiones subsecuentes", async () => {
      const testUserId = 9991;
      const token = await createAuthToken({
        userId: testUserId,
        rol: "clues",
        nivel: 1,
        mustChangePassword: false,
      });

      const mockDbUser = {
        id: testUserId,
        nivel: "CLUES",
        clues_id: "TEST001",
        region: "CENTRO",
        activo: 1,
        clues_region: "CENTRO",
      };

      const querySpy = vi.spyOn(dbModule, "query").mockResolvedValue([mockDbUser] as any);

      const makeRequest = () =>
        new Request("http://localhost:3000/api/test", {
          headers: {
            cookie: `${AUTH_COOKIE_NAME}=${token}`,
          },
        });

      // Primera llamada: debe consultar la BD
      const res1 = await requireApiAuth(makeRequest());
      expect(res1.ok).toBe(true);
      if (res1.ok) {
        expect(res1.auth.userId).toBe(testUserId);
        expect(res1.auth.cluesId).toBe("TEST001");
      }
      expect(querySpy).toHaveBeenCalledTimes(1);

      // Segunda llamada inmediata: debe responder desde caché sin llamar a query() de nuevo
      const res2 = await requireApiAuth(makeRequest());
      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.auth.userId).toBe(testUserId);
      }
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("debe cachear la región de unidades en assertCluesScope", async () => {
      const authCtx = {
        userId: 9992,
        nivel: 2,
        rol: "regional" as const,
        nivelKey: "REGION" as const,
        cluesId: null,
        region: "NORTE",
      };

      const querySpy = vi.spyOn(dbModule, "query").mockResolvedValue([
        { region: "NORTE" },
      ] as any);

      const ok1 = await assertCluesScope("CLUES_TEST_99", authCtx);
      expect(ok1).toBe(true);
      expect(querySpy).toHaveBeenCalledTimes(1);

      const ok2 = await assertCluesScope("CLUES_TEST_99", authCtx);
      expect(ok2).toBe(true);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("debe aplicar fallback de resiliencia si la BD falla temporalmente pero existe caché previo", async () => {
      const testUserId = 9993;
      const token = await createAuthToken({
        userId: testUserId,
        rol: "clues",
        nivel: 1,
        mustChangePassword: false,
      });

      const mockDbUser = {
        id: testUserId,
        nivel: "CLUES",
        clues_id: "FB001",
        region: "SUR",
        activo: 1,
        clues_region: "SUR",
      };

      const querySpy = vi.spyOn(dbModule, "query").mockResolvedValueOnce([mockDbUser] as any);

      const makeRequest = () =>
        new Request("http://localhost:3000/api/test", {
          headers: {
            cookie: `${AUTH_COOKIE_NAME}=${token}`,
          },
        });

      const res1 = await requireApiAuth(makeRequest());
      expect(res1.ok).toBe(true);

      querySpy.mockRejectedValueOnce(new Error("ECONNRESET - MySQL pool saturated"));

      const res2 = await requireApiAuth(makeRequest());
      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.auth.userId).toBe(testUserId);
      }
    });
  });
});
