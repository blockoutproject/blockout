-- Complements collector-sporting.sql in this explicitly disposable migrated database only.
-- Provider interpretation is synthetic; the actual collector clients and owner writes stay real.
UPDATE sporting_pack SET provider='LNV';
UPDATE sporting_pool SET provider='LNV', group_reference='GROUP', calendar_url='https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=COMP&PID=POOL';
UPDATE collection_source_binding SET provider='LNV', accepted_url='https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=COMP&PID=POOL';
UPDATE collection_control SET family='LNV' WHERE id='00000000-0000-4000-8000-000000000197';
INSERT INTO sporting_pool(id,season_id,pack_id,provider,organizer_reference,competition_reference,reference,group_reference,source_name,division_id,format,gender,setting_division_id,setting_format,setting_gender,calendar_url)
SELECT '00000000-0000-4000-8000-000000000200',season_id,pack_id,provider,organizer_reference,competition_reference,'SECOND',group_reference,'Synthetic second pool',division_id,format,gender,setting_division_id,setting_format,setting_gender,'https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=COMP&PID=SECOND' FROM sporting_pool;
INSERT INTO sporting_club(id,provider,reference,source_name,municipality,postal_code,locality_revision)
VALUES ('00000000-0000-4000-8000-000000000201','FFVB','000200','Synthetic presentation club','Paris','75001',1);
DELETE FROM collection_control WHERE season_id IS NULL;
INSERT INTO collection_control(id,family,enabled) VALUES
('00000000-0000-4000-8000-000000000202','CLUB_SHEETS',TRUE),
('00000000-0000-4000-8000-000000000203','GEOCODING',TRUE);
