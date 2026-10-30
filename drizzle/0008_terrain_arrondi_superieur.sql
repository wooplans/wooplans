-- Terrain minimum : surface arrondie au multiple de 50 m² supérieur (au lieu d'inférieur), pour les fiches
-- dont la valeur vient du calcul automatique (bâtiment + 3 m × bâtiment + 7 m). Les valeurs saisies à la main ne changent pas.
UPDATE `plans`
SET `land_area` = CAST(((`building_width` + 3) * (`building_depth` + 7)) / 50 AS INTEGER) * 50
    + ((((`building_width` + 3) * (`building_depth` + 7)) > CAST(((`building_width` + 3) * (`building_depth` + 7)) / 50 AS INTEGER) * 50) * 50)
WHERE `building_width` IS NOT NULL
  AND `building_depth` IS NOT NULL
  AND `land_area` = CAST(((`building_width` + 3) * (`building_depth` + 7)) / 50 AS INTEGER) * 50;
