SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE public.user_roles (
    name character varying NOT NULL
);


CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying NOT NULL,
    pass_enc bytea,
    role character varying,
    password character varying,
    token bytea,
    protected boolean DEFAULT false
);



CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO leyden;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (name);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_key UNIQUE (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_name_key UNIQUE (name);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_fkey FOREIGN KEY (role) REFERENCES public.user_roles(name);

