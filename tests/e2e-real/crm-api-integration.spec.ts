import { expect, test } from "@playwright/test";

test.describe("CRM workspace against the real API", () => {
  test("logs in with the seeded clinic admin and renders real clinic data", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await expect(page.getByText("Sessao bloqueada")).toBeVisible();

    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    await expect(
      page.getByRole("heading", { name: "Camila Rocha", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Clinica Aurora.*Admin/, { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("Ana Martins")).toBeVisible();
    await expect(page.getByText("CPF 12345678900")).toBeVisible();
    await expect(
      page.getByText("Criado automaticamente pelo seed local."),
    ).toBeVisible();
    await expect(page.getByText("Bruno Araujo")).not.toBeVisible();
  });

  test("creates a patient and schedules a new appointment through the real API", async ({
    page,
  }) => {
    const uniqueSuffix = Date.now().toString().slice(-5);
    const patientName = `Paula Nunes ${uniqueSuffix}`;
    const patientEmail = `paula.${uniqueSuffix}@email.com`;
    const patientCpf = `789456${uniqueSuffix}`;
    const appointmentNote = `Consulta criada no Playwright ${uniqueSuffix}`;

    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    await expect(
      page.getByRole("heading", { name: "Camila Rocha", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Ana Martins")).toBeVisible();

    await page.getByRole("button", { name: "Novo paciente" }).click();
    const patientForm = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Salvar paciente" }) });
    await patientForm.getByLabel("Nome").fill(patientName);
    await patientForm.getByLabel("CPF").fill(patientCpf);
    await patientForm.getByLabel("Telefone").fill("11995554444");
    await patientForm.getByLabel("Data de nascimento").fill("1992-04-10");
    await patientForm.getByLabel("Email").fill(patientEmail);
    await patientForm.getByLabel("Convenio").fill("Particular");
    await patientForm
      .getByLabel("Observacoes")
      .fill("Paciente criado pelo fluxo real.");
    await patientForm.getByRole("button", { name: "Salvar paciente" }).click();

    await expect(page.getByText(patientName)).toBeVisible();

    await page.getByRole("button", { name: "Agendar consulta" }).click();
    const appointmentForm = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Salvar consulta" }) });
    await appointmentForm.getByLabel("Paciente").selectOption({ label: patientName });
    await appointmentForm.getByLabel("Medico").selectOption({ index: 1 });
    await appointmentForm.getByLabel("Inicio").fill("2026-05-07T16:00");
    await appointmentForm.getByLabel("Duracao (min)").fill("30");
    await appointmentForm.getByLabel("Tipo").fill("Consulta de retorno");
    await appointmentForm.getByLabel("Valor").fill("220");
    await appointmentForm.getByLabel("Observacoes").fill(appointmentNote);
    await appointmentForm
      .getByRole("button", { name: "Salvar consulta" })
      .click();

    await expect(page.getByText(appointmentNote)).toBeVisible();
    await expect(page.getByText("Consulta de retorno")).toBeVisible();
  });

  test("searches and paginates the patient list through the real API", async ({
    page,
  }) => {
    const suffix = Date.now().toString().slice(-5);
    const patientNames = [
      `Zeta Busca A ${suffix}`,
      `Zeta Busca B ${suffix}`,
      `Zeta Busca C ${suffix}`,
    ];

    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    for (const [index, patientName] of patientNames.entries()) {
      await page.getByRole("button", { name: "Novo paciente" }).click();
      const patientForm = page
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "Salvar paciente" }) });
      await patientForm.getByLabel("Nome").fill(patientName);
      await patientForm.getByLabel("CPF").fill(`78945${suffix}${index}`);
      await patientForm.getByLabel("Telefone").fill(`11995554${index}${index}`);
      await patientForm.getByLabel("Data de nascimento").fill("1992-04-10");
      await patientForm
        .getByLabel("Email")
        .fill(`zeta.${suffix}.${index}@email.com`);
      await patientForm.getByLabel("Convenio").fill("Particular");
      await patientForm
        .getByLabel("Observacoes")
        .fill("Paciente criado para busca e paginacao.");
      await patientForm.getByRole("button", { name: "Salvar paciente" }).click();
      await expect(patientForm).toBeHidden();
    }

    const searchInput = page.getByPlaceholder("Buscar por nome, CPF ou telefone");
    await searchInput.fill(patientNames[1]);

    await expect(page.getByText(patientNames[1])).toBeVisible();
    await expect(page.getByText(patientNames[0])).not.toBeVisible();

    await searchInput.fill("");
    await page.getByRole("button", { name: "Proxima pagina" }).click();

    await expect(page.getByText(patientNames[2])).toBeVisible();
    await expect(page.getByText("Pagina 2 de 2")).toBeVisible();
  });

  test("navigates the agenda by date through the real API", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    await expect(
      page.getByText("Criado automaticamente pelo seed local."),
    ).toBeVisible();

    await page.getByLabel("Data da agenda").fill("2026-05-08");
    await expect(
      page.getByText("Nenhuma consulta encontrada para a data selecionada."),
    ).toBeVisible();

    await page.getByLabel("Data da agenda").fill("2026-05-07");
    await expect(
      page.getByText("Criado automaticamente pelo seed local."),
    ).toBeVisible();
  });

  test("updates seeded patient and doctor data through the real API", async ({
    page,
  }) => {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const updatedPatientName = `Ana Martins ${uniqueSuffix}`;
    const updatedDoctorName = `Dr. Henrique Lima ${uniqueSuffix}`;

    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    const patientCard = page
      .locator("article")
      .filter({ hasText: "CPF 12345678900" })
      .first();

    await patientCard.getByRole("button", { name: "Editar cadastro" }).click();
    await patientCard.getByLabel("Nome").fill(updatedPatientName);
    await patientCard.getByLabel("Telefone").fill("11988887777");
    await patientCard
      .getByLabel("Email")
      .fill(`ana.${uniqueSuffix}@email.com`);
    await patientCard.getByLabel("Convenio").fill("Particular Premium");
    await patientCard
      .getByLabel("Observacoes")
      .fill("Cadastro atualizado pelo Playwright real.");
    await patientCard
      .getByRole("button", { name: "Salvar alteracoes" })
      .click();

    await expect(
      page.getByText(`${updatedPatientName} atualizado com sucesso.`),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: updatedPatientName, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Particular Premium")).toBeVisible();

    const doctorCard = page
      .locator("article")
      .filter({ hasText: "CRM-SP-123456" })
      .first();

    await doctorCard.getByRole("button", { name: "Editar medico" }).click();
    await doctorCard.getByLabel("Nome").fill(updatedDoctorName);
    await doctorCard.getByLabel("Especialidade").fill("Cardiologia clinica");
    await doctorCard.getByLabel("Telefone").fill("11994443322");
    await doctorCard
      .getByLabel("Email")
      .fill(`henrique.${uniqueSuffix}@clinicaaurora.com`);
    await doctorCard
      .getByRole("button", { name: "Salvar alteracoes" })
      .click();

    await expect(
      page.getByText(`${updatedDoctorName} atualizado com sucesso.`),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: updatedDoctorName, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Cardiologia clinica")).toBeVisible();
  });

  test("confirms and cancels the seeded appointment through the real API", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    const appointmentCard = page
      .locator("article")
      .filter({ hasText: "Criado automaticamente pelo seed local." })
      .first();

    await appointmentCard
      .getByRole("button", { name: "Confirmar consulta" })
      .click();

    await expect(
      page.getByText("Primeira consulta confirmada com sucesso."),
    ).toBeVisible();
    await expect(appointmentCard.getByText("Confirmed")).toBeVisible();

    await appointmentCard
      .getByRole("button", { name: "Cancelar consulta" })
      .click();

    await expect(
      page.getByText("Primeira consulta cancelada com sucesso."),
    ).toBeVisible();
    await expect(appointmentCard.getByText("Cancelled")).toBeVisible();
  });

  test("registers a partial payment and refreshes receivables plus dashboard revenue", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    await expect(
      page.getByRole("heading", { name: "Camila Rocha", exact: true }),
    ).toBeVisible();

    const receivableCard = page
      .locator("article")
      .filter({ hasText: "Em aberto" })
      .filter({ hasText: "R$ 250,00" })
      .first();

    await receivableCard
      .getByRole("button", { name: "Registrar pagamento" })
      .click();

    const paymentForm = receivableCard.locator("form");
    await paymentForm.getByLabel("Valor recebido").fill("75");
    await paymentForm.getByLabel("Forma de pagamento").selectOption("Pix");
    await paymentForm.getByLabel("Data do pagamento").fill("2026-05-07T14:00");
    await paymentForm
      .getByLabel("Observacoes")
      .fill("Pagamento parcial via Playwright real.");
    await paymentForm
      .getByRole("button", { name: "Confirmar pagamento" })
      .click();

    await expect(receivableCard.getByText("Partial")).toBeVisible();
    await expect(receivableCard.getByText("R$ 75,00")).toBeVisible();
    await expect(receivableCard.getByText("R$ 175,00")).toBeVisible();
    await expect(
      page
        .locator("article")
        .filter({ hasText: "Faturamento mensal" })
        .getByText("R$ 75,00"),
    ).toBeVisible();
  });

  test("uploads, downloads and removes a patient document through the authenticated session", async ({
    page,
  }) => {
    const fileName = `laudo-cardiologia-${Date.now()}.pdf`;

    await page.goto("/");

    await page.getByRole("button", { name: "Encerrar sessao" }).click();
    await page.getByLabel("Email").fill("admin@clinicaaurora.com");
    await page.getByLabel("Senha").fill("ChangeMe123!");
    await page.getByLabel("Perfil").selectOption("Admin");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    await expect(page.getByText("CPF 12345678900")).toBeVisible();

    const patientCard = page
      .locator("article")
      .filter({ hasText: "CPF 12345678900" })
      .first();

    await patientCard.getByRole("button", { name: "Documentos" }).click();

    await expect(patientCard.getByText("Documentos do paciente")).toBeVisible();

    await patientCard.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf-content-demo"),
    });

    await patientCard
      .getByRole("button", { name: "Registrar documento" })
      .click();

    await expect(
      patientCard.getByRole("heading", {
        name: fileName,
        exact: true,
      }),
    ).toBeVisible();
    await expect(patientCard.getByText("application/pdf")).toBeVisible();
    await expect(
      patientCard.getByText(
        /clinics\/11111111-1111-1111-1111-111111111111\/patients\/dddddddd-dddd-dddd-dddd-dddddddddddd/i,
      ),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await patientCard.getByRole("button", { name: "Baixar arquivo" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(fileName);

    await patientCard
      .getByRole("button", { name: "Excluir documento" })
      .click();

    await expect(
      patientCard.getByText(`${fileName} removido com sucesso.`),
    ).toBeVisible();
    await expect(
      patientCard.getByText(
        "Nenhum documento registrado para este paciente ainda.",
      ),
    ).toBeVisible();
  });
});
