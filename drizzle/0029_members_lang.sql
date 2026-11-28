-- Langue de l'espace Premium (décision de Tao, 28 nov. 2026) : fr par défaut, en pour les achats de la page anglaise.
ALTER TABLE `members` ADD `lang` text DEFAULT 'fr' NOT NULL;
