CREATE TABLE records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), PRIMARY KEY(collection,id));
--> statement-breakpoint
CREATE UNIQUE INDEX users_email ON records(json_extract(data,'$.email')) WHERE collection='User';
--> statement-breakpoint
CREATE UNIQUE INDEX users_username ON records(json_extract(data,'$.username')) WHERE collection='User' AND json_extract(data,'$.username') IS NOT NULL AND json_extract(data,'$.username') <> '';
--> statement-breakpoint
CREATE UNIQUE INDEX users_identity ON records(json_extract(data,'$.identityId')) WHERE collection='User' AND json_extract(data,'$.identityId') IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX professors_email ON records(json_extract(data,'$.email')) WHERE collection='Professor';
--> statement-breakpoint
CREATE UNIQUE INDEX feedback_session_student ON records(json_extract(data,'$.session'), json_extract(data,'$.student')) WHERE collection='Feedback';
--> statement-breakpoint
CREATE UNIQUE INDEX applications_project_student ON records(json_extract(data,'$.project'), json_extract(data,'$.student')) WHERE collection='Application';
--> statement-breakpoint
CREATE UNIQUE INDEX reads_session_user ON records(json_extract(data,'$.session'), json_extract(data,'$.user')) WHERE collection='UserSessionRead';
