import test from 'node:test';
import assert from 'node:assert/strict';

const SENSITIVE_KEYS = new Set([
  'senha',
  'password',
  'token',
  'authorization',
  'jwt',
  'secret',
]);

function sanitizeForOfflineStorage(input) {
  if (input === null || input === undefined || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForOfflineStorage(item));
  }
  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }
    clean[key] = sanitizeForOfflineStorage(value);
  }
  return clean;
}

function getUserScope(user) {
  if (!user || !user.username) {
    return 'anonymous';
  }
  return `${user.id ?? 0}:${user.username.trim().toLowerCase()}`;
}

function calcularDoseClinica({
  tipoCalculo,
  peso,
  dosePorKg,
  doseMaxima,
  doseDisponivel,
  volumeDisponivel,
  fatorGotejamento,
  tempoMinutos,
}) {
  const doseBrutaMg = dosePorKg * peso;
  const doseMaximaExcedida =
    typeof doseMaxima === 'number' && doseMaxima > 0 && doseBrutaMg > doseMaxima;

  if (tipoCalculo === 'dose') {
    return {
      valor: Number(doseBrutaMg.toFixed(2)),
      unidade: 'mg',
      doseMaximaExcedida,
    };
  }
  if (tipoCalculo === 'volume') {
    if (doseDisponivel <= 0 || volumeDisponivel <= 0) {
      return { valor: 0, unidade: 'mL/h', doseMaximaExcedida, erro: true };
    }
    const concentracao = doseDisponivel / volumeDisponivel;
    const volume = doseBrutaMg / concentracao;
    return {
      valor: Number(volume.toFixed(2)),
      unidade: 'mL/h',
      doseMaximaExcedida,
    };
  }
  if (tipoCalculo === 'gotas') {
    if (
      tempoMinutos <= 0 ||
      fatorGotejamento <= 0 ||
      doseDisponivel <= 0 ||
      volumeDisponivel <= 0
    ) {
      return { valor: 0, unidade: 'gotas/min', doseMaximaExcedida, erro: true };
    }
    const concentracao = doseDisponivel / volumeDisponivel;
    const volumeMl = doseBrutaMg / concentracao;
    const gotas = (volumeMl * fatorGotejamento) / tempoMinutos;
    return {
      valor: Number(gotas.toFixed(2)),
      unidade: 'gotas/min',
      doseMaximaExcedida,
    };
  }
  throw new Error('Tipo de cálculo inválido');
}

test('sanitizeForOfflineStorage remove senhas, tokens, authorization e segredos recursivamente', () => {
  const rawPayload = {
    nome: 'Paciente Seguro',
    cpf: '529.982.247-25',
    senha: 'SenhaUltraSecreta123',
    token: 'eyJhbGciOiJIUzI1NiJ9...',
    Authorization: 'Bearer xxx',
    nested: {
      password: '123',
      jwt: 'abc',
      secret: 'xyz',
      observacao: 'Uso clínico autorizado',
    },
  };

  const sanitized = sanitizeForOfflineStorage(rawPayload);
  assert.equal(sanitized.nome, 'Paciente Seguro');
  assert.equal(sanitized.cpf, '529.982.247-25');
  assert.equal('senha' in sanitized, false);
  assert.equal('token' in sanitized, false);
  assert.equal('Authorization' in sanitized, false);
  assert.equal('password' in sanitized.nested, false);
  assert.equal('jwt' in sanitized.nested, false);
  assert.equal('secret' in sanitized.nested, false);
  assert.equal(sanitized.nested.observacao, 'Uso clínico autorizado');
});

test('getUserScope isola cache por ID e username normalizado', () => {
  assert.equal(getUserScope({ id: 10, username: 'Dr.House' }), '10:dr.house');
  assert.equal(getUserScope({ id: 25, username: 'Enf.Clara' }), '25:enf.clara');
  assert.notEqual(
    getUserScope({ id: 10, username: 'Dr.House' }),
    getUserScope({ id: 25, username: 'Enf.Clara' })
  );
  assert.equal(getUserScope(null), 'anonymous');
});

test('Cálculo clínico DOSE_MGKG, VOLUME_MLH, GOTAS_MIN e detecção de dose máxima', () => {
  const dipirona = {
    dosePorKg: 20,
    doseMaxima: 1000,
    doseDisponivel: 500,
    volumeDisponivel: 1,
    fatorGotejamento: 20,
    tempoMinutos: 60,
  };

  // Paciente 30kg -> 20 * 30 = 600mg (abaixo de 1000mg)
  const dose30kg = calcularDoseClinica({
    tipoCalculo: 'dose',
    peso: 30,
    ...dipirona,
  });
  assert.equal(dose30kg.valor, 600);
  assert.equal(dose30kg.unidade, 'mg');
  assert.equal(dose30kg.doseMaximaExcedida, false);

  // Paciente 60kg -> 20 * 60 = 1200mg (excede dose máxima de 1000mg!)
  const dose60kg = calcularDoseClinica({
    tipoCalculo: 'dose',
    peso: 60,
    ...dipirona,
  });
  assert.equal(dose60kg.valor, 1200);
  assert.equal(dose60kg.doseMaximaExcedida, true);

  // Volume mL/h: 600mg / (500mg / 1mL) = 1.20 mL/h
  const vol30kg = calcularDoseClinica({
    tipoCalculo: 'volume',
    peso: 30,
    ...dipirona,
  });
  assert.equal(vol30kg.valor, 1.2);
  assert.equal(vol30kg.unidade, 'mL/h');

  // Gotas/min: (1.2 mL * 20 gotas/mL) / 60 min = 0.40 gotas/min
  const gotas30kg = calcularDoseClinica({
    tipoCalculo: 'gotas',
    peso: 30,
    ...dipirona,
  });
  assert.equal(gotas30kg.valor, 0.4);
  assert.equal(gotas30kg.unidade, 'gotas/min');
});
