ALTER TABLE workstations
  ADD COLUMN modalidad ENUM('presencial', 'teletrabajo') NOT NULL DEFAULT 'presencial' AFTER departamento,
  ADD COLUMN anydesk_password VARCHAR(255) NULL AFTER anydesk_address;
