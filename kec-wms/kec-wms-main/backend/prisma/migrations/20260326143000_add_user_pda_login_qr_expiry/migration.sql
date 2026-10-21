ALTER TABLE `user`
  ADD COLUMN `pda_login_qr_expires_at` DATETIME(3) NULL;

CREATE INDEX `user_pda_login_qr_expires_at_idx`
  ON `user`(`pda_login_qr_expires_at`);
