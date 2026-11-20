-- +goose Up
CREATE TABLE roles (
  id   SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES
  ('investor'),
  ('issuer'),
  ('property_manager'),
  ('tenant'),
  ('platform_admin');

-- user_id has no FK: users live in Better Auth's "auth" schema, owned by another system.
CREATE TABLE user_roles (
  user_id    TEXT        NOT NULL,
  role_id    SMALLINT    NOT NULL REFERENCES roles (id),
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX user_roles_role_id_idx ON user_roles (role_id);

-- +goose Down
DROP TABLE user_roles;
DROP TABLE roles;
