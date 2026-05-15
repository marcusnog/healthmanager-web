import type { Page, Route } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
  "content-type": "application/json",
};

function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: corsHeaders,
    body: JSON.stringify(body),
  });
}

export async function mockCrmApi(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const jsonHeaders = {
      "Content-Type": "application/json",
    };

    const matchMockPath = (input: string) => {
      if (
        input.startsWith("/backend/") ||
        input.startsWith("http://127.0.0.1:3000/backend/") ||
        input.startsWith("http://localhost:3000/backend/") ||
        input.startsWith("http://127.0.0.1:8080/") ||
        input.startsWith("http://localhost:8080/")
      ) {
        const url = new URL(input, window.location.origin);
        return {
          method: "GET",
          path: url.pathname.replace(/^\/backend/, ""),
          url,
        };
      }

      return null;
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const inputUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const matched = matchMockPath(inputUrl);
      if (!matched) {
        return originalFetch(input, init);
      }

      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const path = matched.path;
      const response = (body: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(body), {
            status,
            headers: jsonHeaders,
          }),
        );

      if (method === "GET" && path === "/dashboard/summary") {
        return response({
          appointmentsToday: 21,
          confirmedToday: 16,
          cancelledToday: 1,
          monthlyRevenue: 45120.5,
          noShowRate: 0.05,
          confirmationRate: 0.81,
        });
      }

      if (method === "GET" && path === "/patients") {
        return response({
          items: [
            {
              id: "patient-1",
              name: "Marina Souza",
              cpf: "12345678901",
              phone: "(11) 98888-0000",
              email: "marina@email.com",
              healthInsurance: "Particular",
            },
          ],
          page: 1,
          pageSize: 3,
          total: 1,
        });
      }

      if (method === "GET" && path === "/appointments") {
        return response({
          items: [
            {
              id: "appointment-1",
              patientId: "patient-1",
              doctorId: "doctor-1",
              startAt: "2026-05-07T11:00:00Z",
              endAt: "2026-05-07T11:30:00Z",
              status: "Scheduled",
              confirmationStatus: "Pending",
              type: "Primeira consulta",
              amount: 250,
              notes: "Paciente novo",
            },
          ],
          page: 1,
          pageSize: 10,
          total: 1,
        });
      }

      if (method === "GET" && path === "/doctors") {
        return response([
          {
            id: "doctor-1",
            name: "Dra. Luciana Costa",
            specialty: "Dermatologia",
            crm: "CRM-SP-987654",
            phone: "11997776655",
            email: "luciana@clinica.com",
            isActive: true,
          },
        ]);
      }

      if (method === "GET" && path === "/receivables") {
        return response({
          items: [
            {
              id: "receivable-1",
              appointmentId: "appointment-1",
              originalAmount: 250,
              receivedAmount: 100,
              outstandingAmount: 150,
              status: "Partial",
              dueDate: "2026-05-07T00:00:00Z",
            },
          ],
          page: 1,
          pageSize: 5,
          total: 1,
        });
      }

      if (method === "POST" && path === "/auth/login") {
        const rawBody = init?.body;
        const payload =
          typeof rawBody === "string"
            ? (JSON.parse(rawBody) as { email?: string; password?: string })
            : {};

        return response({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: "2026-05-08T15:30:00Z",
          user: {
            id: "user-1",
            clinicId: "clinic-1",
            name: payload.email?.split("@")[0] ?? "secretaria",
            email: payload.email ?? "secretaria@clinicaaurora.com",
            role: "Secretary",
          },
        });
      }

      if (method === "POST" && path === "/auth/logout") {
        return response({});
      }

      if (method === "POST" && path === "/auth/refresh") {
        return response({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: "2026-05-08T15:30:00Z",
          user: {
            id: "user-1",
            clinicId: "clinic-1",
            name: "secretaria",
            email: "secretaria@clinicaaurora.com",
            role: "Secretary",
          },
        });
      }

      return originalFetch(input, init);
    };
  });

  await page.route("**/backend/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/backend/, "");

    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
      return;
    }

    if (method === "GET" && path === "/dashboard/summary") {
      await fulfillJson(route, {
        appointmentsToday: 21,
        confirmedToday: 16,
        cancelledToday: 1,
        monthlyRevenue: 45120.5,
        noShowRate: 0.05,
        confirmationRate: 0.81,
      });
      return;
    }

    if (method === "GET" && path === "/patients") {
      await fulfillJson(route, {
        items: [
          {
            id: "patient-1",
            name: "Marina Souza",
            cpf: "12345678901",
            phone: "(11) 98888-0000",
            email: "marina@email.com",
            healthInsurance: "Particular",
          },
        ],
        page: 1,
        pageSize: 3,
        total: 1,
      });
      return;
    }

    if (method === "GET" && path === "/appointments") {
      await fulfillJson(route, {
        items: [
          {
            id: "appointment-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            startAt: "2026-05-07T11:00:00Z",
            endAt: "2026-05-07T11:30:00Z",
            status: "Scheduled",
            confirmationStatus: "Pending",
            type: "Primeira consulta",
            amount: 250,
            notes: "Paciente novo",
          },
        ],
        page: 1,
        pageSize: 10,
        total: 1,
      });
      return;
    }

    if (method === "GET" && path === "/doctors") {
      await fulfillJson(route, [
        {
          id: "doctor-1",
          name: "Dra. Luciana Costa",
          specialty: "Dermatologia",
          crm: "CRM-SP-987654",
          phone: "11997776655",
          email: "luciana@clinica.com",
          isActive: true,
        },
      ]);
      return;
    }

    if (method === "GET" && path === "/receivables") {
      await fulfillJson(route, {
        items: [
          {
            id: "receivable-1",
            appointmentId: "appointment-1",
            originalAmount: 250,
            receivedAmount: 100,
            outstandingAmount: 150,
            status: "Partial",
            dueDate: "2026-05-07T00:00:00Z",
          },
        ],
        page: 1,
        pageSize: 5,
        total: 1,
      });
      return;
    }

    if (method === "POST" && path === "/auth/login") {
      const payload = request.postDataJSON() as {
        email?: string;
      };

      await fulfillJson(route, {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: "2026-05-08T15:30:00Z",
        user: {
          id: "user-1",
          clinicId: "clinic-1",
          name: payload.email?.split("@")[0] ?? "secretaria",
          email: payload.email ?? "secretaria@clinicaaurora.com",
          role: "Secretary",
        },
      });
      return;
    }

    if (method === "POST" && (path === "/auth/logout" || path === "/auth/refresh")) {
      await fulfillJson(route, {});
      return;
    }

    await route.abort();
  });
}
