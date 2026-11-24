-- Eventuali duplicati già presenti devono essere risolti prima di applicare l'indice.
CREATE UNIQUE INDEX "atto_normativo_identificativo_normalizzato_idx" ON "atto_normativo" USING btree (upper(regexp_replace("identificativo_ufficiale", U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', '', 'g')));
