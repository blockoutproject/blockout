-- Synthetic input only, in the explicitly supplied disposable qualification database.
-- Liquibase owns the schema; no test-created table or production/provider data is used.
TRUNCATE sporting_season, sporting_division, sporting_club, collection_source_binding, sporting_catalog, collection_cycle CASCADE;

INSERT INTO sporting_season(id, start_year, label, collection_state)
VALUES ('00000000-0000-4000-8000-000000000192', 2026, '2026/2027', 'ACTIVE');
INSERT INTO sporting_division(id, name, active, color)
VALUES ('00000000-0000-4000-8000-000000000193', 'Synthetic qualification', TRUE, '#112233');
INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference)
VALUES ('00000000-0000-4000-8000-000000000194', '00000000-0000-4000-8000-000000000192', 'FFVB', 'SYNTHETIC', 'PACK');
INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference,
 competition_reference, reference, source_name, division_id, format, gender,
 setting_division_id, setting_format, setting_gender, calendar_url)
VALUES ('00000000-0000-4000-8000-000000000195', '00000000-0000-4000-8000-000000000192',
 '00000000-0000-4000-8000-000000000194', 'FFVB', 'SYNTHETIC', 'COMP', 'POOL', 'Synthetic pool',
 '00000000-0000-4000-8000-000000000193', '_6X6', 'MALE',
 '00000000-0000-4000-8000-000000000193', '_6X6', 'MALE',
 'https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php');
INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, accepted_url,
 validation_state, locked, launched)
VALUES ('00000000-0000-4000-8000-000000000196', '00000000-0000-4000-8000-000000000192', 'FFVB',
 'SYNTHETIC', 'https://www.ffvbbeach.org/ffvbapp/resu/', 'QUALIFIED', TRUE, TRUE);
INSERT INTO collection_control(id, season_id, family, enabled)
VALUES ('00000000-0000-4000-8000-000000000197', '00000000-0000-4000-8000-000000000192', 'FFVB', TRUE);
