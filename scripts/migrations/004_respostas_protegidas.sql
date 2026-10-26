ALTER TABLE request_records ADD COLUMN encrypted_response text;
UPDATE request_records SET response=response-'manageToken' WHERE response ? 'manageToken';
