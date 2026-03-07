--
-- PostgreSQL database dump
--

\restrict eWm3UMiAy5v8LddlQn18CHXfpnZAV6n8keh5KPUkO2UD0dSe3wxIwO2FttFffg8

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

ALTER TABLE IF EXISTS ONLY public.support_services DROP CONSTRAINT IF EXISTS support_services_business_id_businesses_id_fk;
ALTER TABLE IF EXISTS ONLY public.spare_parts DROP CONSTRAINT IF EXISTS spare_parts_business_id_businesses_id_fk;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_business_id_businesses_id_fk;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_business_id_businesses_id_fk;
ALTER TABLE IF EXISTS ONLY public.garage_services DROP CONSTRAINT IF EXISTS garage_services_garage_id_businesses_id_fk;
ALTER TABLE IF EXISTS ONLY public.cars DROP CONSTRAINT IF EXISTS cars_dealer_id_businesses_id_fk;
ALTER TABLE IF EXISTS ONLY public.businesses DROP CONSTRAINT IF EXISTS businesses_owner_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.business_reports DROP CONSTRAINT IF EXISTS business_reports_business_id_businesses_id_fk;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.support_services DROP CONSTRAINT IF EXISTS support_services_pkey;
ALTER TABLE IF EXISTS ONLY public.spare_parts DROP CONSTRAINT IF EXISTS spare_parts_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.garage_services DROP CONSTRAINT IF EXISTS garage_services_pkey;
ALTER TABLE IF EXISTS ONLY public.cars DROP CONSTRAINT IF EXISTS cars_pkey;
ALTER TABLE IF EXISTS ONLY public.businesses DROP CONSTRAINT IF EXISTS businesses_pkey;
ALTER TABLE IF EXISTS ONLY public.business_reports DROP CONSTRAINT IF EXISTS business_reports_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.support_services;
DROP TABLE IF EXISTS public.spare_parts;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.garage_services;
DROP TABLE IF EXISTS public.cars;
DROP TABLE IF EXISTS public.businesses;
DROP TABLE IF EXISTS public.business_reports;
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.transmission;
DROP TYPE IF EXISTS public.report_reason;
DROP TYPE IF EXISTS public.part_condition;
DROP TYPE IF EXISTS public.fuel_type;
DROP TYPE IF EXISTS public.business_status;
DROP TYPE IF EXISTS public.business_category;
--
-- Name: business_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.business_category AS ENUM (
    'car_dealer',
    'garage',
    'spare_parts',
    'car_wash',
    'insurance',
    'other'
);


--
-- Name: business_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.business_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: fuel_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fuel_type AS ENUM (
    'petrol',
    'diesel',
    'hybrid',
    'electric',
    'other'
);


--
-- Name: part_condition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.part_condition AS ENUM (
    'new',
    'used'
);


--
-- Name: report_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_reason AS ENUM (
    'fake_listing',
    'scam',
    'misleading_info',
    'other'
);


--
-- Name: transmission; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transmission AS ENUM (
    'automatic',
    'manual'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'owner'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: business_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_reports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    business_id character varying NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    reason public.report_reason NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    owner_id character varying NOT NULL,
    name text NOT NULL,
    category public.business_category NOT NULL,
    description text NOT NULL,
    phone text NOT NULL,
    whatsapp text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    logo text,
    status public.business_status DEFAULT 'pending'::public.business_status NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    latitude numeric,
    longitude numeric
);


--
-- Name: cars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cars (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    dealer_id character varying NOT NULL,
    title text NOT NULL,
    brand text NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    price numeric(15,2) NOT NULL,
    mileage integer,
    fuel_type public.fuel_type DEFAULT 'petrol'::public.fuel_type NOT NULL,
    transmission public.transmission DEFAULT 'automatic'::public.transmission NOT NULL,
    description text,
    images text[],
    location text NOT NULL,
    featured boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: garage_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.garage_services (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    garage_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    price text,
    popular boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    business_id character varying NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    business_id character varying NOT NULL,
    name text NOT NULL,
    rating integer NOT NULL,
    comment text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: spare_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_parts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    business_id character varying NOT NULL,
    part_name text NOT NULL,
    car_brand text NOT NULL,
    car_model text NOT NULL,
    year text,
    condition public.part_condition NOT NULL,
    price text,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: support_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_services (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    business_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    starting_price text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public.user_role DEFAULT 'owner'::public.user_role NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Data for Name: business_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_reports (id, business_id, name, email, reason, description, created_at) FROM stdin;
a8c3d185-e88a-4ab8-903d-005a5f785944	63040437-b778-47c1-9208-da5fcec51f44	Test Reporter	reporter@test.com	misleading_info	The prices listed do not match actual prices.	2026-03-07 08:49:27.17968
92bda1da-0c10-47e0-ab38-e36801daae6b	63040437-b778-47c1-9208-da5fcec51f44	John Doe Test	johndoe@test.com	other	This is a test report submission	2026-03-07 08:51:15.785967
c7a2a556-f9eb-484e-aa5b-9150d5f9c711	63040437-b778-47c1-9208-da5fcec51f44	Jane Tester	jane@test.com	other	Test report for E2E	2026-03-07 08:54:52.023597
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.businesses (id, owner_id, name, category, description, phone, whatsapp, address, city, logo, status, created_at, latitude, longitude) FROM stdin;
4434b50c-b6bc-42b5-a519-46c281da5f24	7ee784fa-961e-4a8c-b21a-3df8d24a2dfc	Mombasa Auto Care	garage	Professional auto care services in Mombasa. Specializing in import vehicle maintenance, AC servicing, and bodywork. Trusted by over 500 clients since 2015.	+254 711 111 222	+254711111222	Digo Road, Mombasa CBD	Mombasa	\N	pending	2026-03-07 07:22:28.504472	\N	\N
63040437-b778-47c1-9208-da5fcec51f44	7ee784fa-961e-4a8c-b21a-3df8d24a2dfc	ABC Motors Ltd	car_dealer	Nairobi's premier car dealership offering a wide selection of new and pre-owned vehicles. We specialize in Japanese imports, European sedans, and SUVs. Our certified mechanics ensure every vehicle is thoroughly inspected before sale.	+254 700 123 456	+254700123456	14 Mombasa Road, Industrial Area	Nairobi	/images/biz1.png	approved	2026-03-07 07:22:28.483217	-1.3049	36.8395
bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	5ef8d2f3-dcba-4b86-8e14-ab013b176cef	Nairobi Pro Garage	garage	Full-service automotive garage with over 15 years of experience. We handle engine repairs, brake services, suspension work, electrical diagnostics, and AC servicing. Our team of certified mechanics uses modern diagnostic tools.	+254 711 654 321	+254711654321	Plot 7, Westlands Commercial Zone	Nairobi	/images/biz2.png	approved	2026-03-07 07:22:28.487252	-1.2670	36.8145
ab1b636d-7928-44da-939d-5106d5a3dbe4	1c043cef-a241-4e55-b81a-ddcd1d56d122	Spare Parts 254	spare_parts	Your one-stop shop for genuine and aftermarket spare parts for all vehicle makes and models. We stock parts for Toyota, Honda, Nissan, Subaru, Mercedes, BMW and many more. Same-day delivery available within Nairobi.	+254 722 987 654	+254722987654	River Road, Shop 24	Nairobi	/images/biz3.png	approved	2026-03-07 07:22:28.492097	-1.2841	36.8218
d264566f-6fbe-4d3b-9248-eb4ccd93ad95	312ac309-4aac-4ba8-9dc5-a9f59737ac62	Shine Car Wash & Detailing	car_wash	Premium car wash and detailing services. We offer hand wash, wax, interior cleaning, ceramic coating, and paint protection film installation. Located conveniently in Westlands with ample parking.	+254 733 456 789	+254733456789	Westlands Road, Opposite Sarit Centre	Nairobi	/images/biz4.png	approved	2026-03-07 07:22:28.495831	-1.2674	36.8068
4e109688-d4f0-4aec-84be-07a19ef71e60	79be37d9-d79c-43ca-a2d1-e8e2636546a3	TrustAuto Insurance	insurance	Comprehensive motor vehicle insurance solutions for individuals and fleet operators. We offer third-party, comprehensive, and PSV coverage at competitive rates. Fast claims processing and 24/7 customer support.	+254 744 321 098	+254744321098	Upper Hill, Finance House, 3rd Floor	Nairobi	/images/biz5.png	approved	2026-03-07 07:22:28.499512	-1.2921	36.7915
\.


--
-- Data for Name: cars; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cars (id, dealer_id, title, brand, model, year, price, mileage, fuel_type, transmission, description, images, location, featured, created_at) FROM stdin;
03c4c332-1f58-4edb-97ef-8b2fa4ffd00c	63040437-b778-47c1-9208-da5fcec51f44	Toyota Land Cruiser V8 2021	Toyota	Land Cruiser	2021	12500000.00	28000	diesel	automatic	Well-maintained Toyota Land Cruiser V8. Full leather interior, sunroof, rear entertainment, and full service history. Single owner.	\N	Nairobi	t	2026-03-07 08:07:29.133645
d8854ac5-ccb0-40a9-a447-7c4896569f93	63040437-b778-47c1-9208-da5fcec51f44	Toyota Prado TX 2019	Toyota	Prado	2019	6800000.00	45000	diesel	automatic	Toyota Prado TX-L in excellent condition. Sunroof, leather seats, rear camera. All service records available.	\N	Nairobi	t	2026-03-07 08:07:29.133645
76945a9b-f8ec-4229-a573-19f613ffae34	63040437-b778-47c1-9208-da5fcec51f44	Subaru Outback 2020	Subaru	Outback	2020	3200000.00	32000	petrol	automatic	Subaru Outback AWD with eye-sight assist, heated seats and sunroof. Clean accident-free history.	\N	Nairobi	t	2026-03-07 08:07:29.133645
b4824c83-9d83-4ebe-8de4-60b9762097a3	63040437-b778-47c1-9208-da5fcec51f44	Honda CRV 2018	Honda	CRV	2018	2700000.00	58000	petrol	automatic	Honda CRV in very good condition. Honda Sensing safety features, keyless entry, heated front seats.	\N	Mombasa	f	2026-03-07 08:07:29.133645
597a9384-17d7-4d11-9f25-bded9c4713fd	63040437-b778-47c1-9208-da5fcec51f44	Mazda CX-5 2020	Mazda	CX-5	2020	3500000.00	41000	diesel	automatic	Mazda CX-5 diesel AWD, Bose sound system, navigation, blind spot monitoring. Excellent fuel economy.	\N	Nairobi	t	2026-03-07 08:07:29.133645
c2b713e5-e070-4662-a393-39c0dc061769	63040437-b778-47c1-9208-da5fcec51f44	Toyota Premio X 2017	Toyota	Premio	2017	1850000.00	72000	petrol	automatic	Toyota Premio in good condition. Low mileage for the year, well-maintained interior. Great fuel economy.	\N	Kisumu	f	2026-03-07 08:07:29.133645
\.


--
-- Data for Name: garage_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.garage_services (id, garage_id, name, description, price, popular, created_at) FROM stdin;
322d5e90-de71-4b43-bf6f-b1dc82098457	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	Full Engine Overhaul	Complete engine rebuild including valve work, piston rings, gaskets, and timing belt replacement. All work comes with a 6-month warranty.	KSh 45,000+	t	2026-03-07 08:07:29.17076
1301bc73-7220-4c65-bbe3-93bab1c9b7a9	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	Oil Change & Filter Service	Full synthetic or semi-synthetic oil change with filter replacement. Includes free 20-point vehicle inspection.	KSh 2,500	t	2026-03-07 08:07:29.17076
e836e23c-21b1-4bc1-bce7-4af55ce5c426	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	Brake Service	Brake pad and disc replacement for all four wheels. Includes brake fluid flush and bleeding.	KSh 8,000+	t	2026-03-07 08:07:29.17076
d278b2f7-8c96-4973-b978-a5980d7bd071	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	AC Service & Recharge	Air conditioning diagnosis, refrigerant recharge, compressor check, and cabin filter replacement.	KSh 4,500	t	2026-03-07 08:07:29.17076
e43bdfeb-92eb-4225-8a20-4619df10727f	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	Wheel Alignment & Balancing	Computer-aided wheel alignment and balancing for all four wheels. Includes tire rotation.	KSh 3,000	f	2026-03-07 08:07:29.17076
ce8a5bb2-54b4-4988-aa27-bedc2f7ff9b6	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	Electrical Diagnostics	Full vehicle electrical system scan using OBD-II diagnostics. Covers ECU, sensors, and warning lights.	KSh 1,500	t	2026-03-07 08:07:29.17076
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, business_id, name, phone, message, is_read, created_at) FROM stdin;
5987cf0f-0ef9-47ce-8c49-9b49adada276	63040437-b778-47c1-9208-da5fcec51f44	Kevin Njoroge	+254 712 555 888	Hi, I'm interested in a 2019 Toyota Premio. Do you have any available? What's the price range?	f	2026-03-07 07:22:28.518739
190716ca-c08c-4154-b75f-d24216724e3f	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	Faith Wambui	+254 723 444 777	I need to book my car for a full service next Saturday. Is there availability?	f	2026-03-07 07:22:28.518739
ebe29144-5b83-4980-81ef-824164c9ea58	ab1b636d-7928-44da-939d-5106d5a3dbe4	Tom Gitau	+254 734 333 666	Do you have brake discs for a 2018 Mazda CX-5? How much would they cost?	f	2026-03-07 07:22:28.518739
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, business_id, name, rating, comment, created_at) FROM stdin;
6541d160-0813-4786-854c-c570eae764c9	63040437-b778-47c1-9208-da5fcec51f44	Michael Kariuki	5	Excellent service! Bought my first car here and the team was very professional and transparent. Highly recommend ABC Motors.	2026-03-07 07:22:28.514123
f70718db-f87c-411c-b2b2-296068a9a2c7	63040437-b778-47c1-9208-da5fcec51f44	Amina Hassan	4	Good selection of vehicles. Prices are fair and the sales team is not pushy. They helped me find the right car for my budget.	2026-03-07 07:22:28.514123
170a4c9d-60f3-49ae-8ead-701bc81376d0	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	John Kiptoo	5	Best garage in Nairobi! Fixed my engine issue quickly and at a reasonable cost. The diagnostic report was very detailed.	2026-03-07 07:22:28.514123
5c548bf2-b7e0-4ebb-9091-be633d6982a8	bae1306e-52fe-49f9-b9b6-aa8fa1e9fe12	Lucy Wangari	5	Brought my Subaru for a full service. The team is knowledgeable and honest. No hidden charges.	2026-03-07 07:22:28.514123
8299c51c-7bb3-4683-ab68-fd52b96bc3ee	ab1b636d-7928-44da-939d-5106d5a3dbe4	Daniel Mutua	4	Great place for spare parts. Found exactly what I needed for my Toyota at a good price. Fast service too.	2026-03-07 07:22:28.514123
69c4b888-eed9-4333-9501-73edb8977aeb	d264566f-6fbe-4d3b-9248-eb4ccd93ad95	Ann Muthoni	5	My car looked brand new after the full detail package. The interior cleaning was exceptional.	2026-03-07 07:22:28.514123
1a66712a-d6c0-48f7-8d33-99b1151a6298	4e109688-d4f0-4aec-84be-07a19ef71e60	Robert Omondi	4	Easy to get insured here. Claims process was smooth when I needed it. Good customer service.	2026-03-07 07:22:28.514123
663e4f25-22a4-4ea2-9658-0824fc050f49	63040437-b778-47c1-9208-da5fcec51f44	Test Reviewer	4	Great service, very professional!	2026-03-07 07:24:57.408254
\.


--
-- Data for Name: spare_parts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spare_parts (id, business_id, part_name, car_brand, car_model, year, condition, price, description, created_at) FROM stdin;
984b64f0-a5ee-41c6-9a9e-131f4b926fe6	ab1b636d-7928-44da-939d-5106d5a3dbe4	Brake Pads (Front)	Toyota	Corolla	2016-2022	new	KSh 2,800	OEM quality front brake pads. Fits all Corolla models 2016-2022.	2026-03-07 07:22:28.509243
62a16554-79f2-42ea-96a5-450f11bf30ff	ab1b636d-7928-44da-939d-5106d5a3dbe4	Air Filter	Honda	Fit	2014-2020	new	KSh 850	Genuine air filter for optimal engine performance.	2026-03-07 07:22:28.509243
a70add19-8c73-4a3c-a03f-d0212a68d3ac	ab1b636d-7928-44da-939d-5106d5a3dbe4	Alternator	Nissan	X-Trail	2008	used	KSh 9,500	Refurbished alternator, tested and in good working condition.	2026-03-07 07:22:28.509243
fea34f46-a5b4-4e83-8fb4-b0f93cdd33bc	ab1b636d-7928-44da-939d-5106d5a3dbe4	Shock Absorbers (Rear Set)	Subaru	Forester	2012-2018	new	KSh 14,500	Heavy duty rear shock absorbers, sold as a pair.	2026-03-07 07:22:28.509243
\.


--
-- Data for Name: support_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_services (id, business_id, name, description, starting_price, created_at) FROM stdin;
d37ac1dc-9f99-45cd-a5a0-d32e98978736	d264566f-6fbe-4d3b-9248-eb4ccd93ad95	Full Hand Wash	Complete exterior hand wash with microfibre cloths, rinse and dry.	500	2026-03-07 09:32:55.867965
3ba8411d-79bd-4032-a539-6b2cb4e9bcfc	d264566f-6fbe-4d3b-9248-eb4ccd93ad95	Interior Detailing	Deep vacuum, dashboard wipe, seat shampoo and odour removal.	1,500	2026-03-07 09:32:55.867965
066d95e3-5adc-44e7-86bf-1fadb15c20e5	d264566f-6fbe-4d3b-9248-eb4ccd93ad95	Ceramic Coating	Professional ceramic coat for long-lasting paint protection (up to 2 years).	25,000	2026-03-07 09:32:55.867965
c750b8f5-86df-473b-9467-191c808fa882	d264566f-6fbe-4d3b-9248-eb4ccd93ad95	Wax & Polish	Premium carnauba wax application for a high-gloss finish.	3,000	2026-03-07 09:32:55.867965
9e54082d-9a69-4785-9af4-f3b2dfbcaf4f	4e109688-d4f0-4aec-84be-07a19ef71e60	Comprehensive Insurance	Full coverage: accident, fire, theft, and third-party liability.	18,000	2026-03-07 09:32:55.867965
f1f68c0d-c025-4518-9ff7-0b80217062e0	4e109688-d4f0-4aec-84be-07a19ef71e60	Third Party Insurance	Mandatory minimum coverage — covers damage to third parties.	5,500	2026-03-07 09:32:55.867965
5512c10f-bd07-4354-a3ad-7748b9829167	4e109688-d4f0-4aec-84be-07a19ef71e60	PSV Insurance	Cover for matatus, buses, and other public service vehicles.	35,000	2026-03-07 09:32:55.867965
95d608de-e6e8-4d1d-84c1-042e53c6b854	4e109688-d4f0-4aec-84be-07a19ef71e60	Fleet Insurance	Discounted bulk cover for 5+ vehicles — ideal for corporates.	90,000	2026-03-07 09:32:55.867965
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password, role, created_at) FROM stdin;
b6e80ce4-e4ca-45cc-95c0-ac318357888b	Admin User	admin@autodirectory.com	$2b$10$wNsZTwJNa.0WEVnbj9xw0eDfYrhr9Ef2K7i6X0f6Ok7RFTvn5RYi.	admin	2026-03-07 07:22:28.4577
7ee784fa-961e-4a8c-b21a-3df8d24a2dfc	James Mwangi	james@abcmotors.co.ke	$2b$10$mabxKOCwI46KtmjJDRlSiOraqT1n0cDAAIwe5CPITSXrKcHKVXuB6	owner	2026-03-07 07:22:28.462773
5ef8d2f3-dcba-4b86-8e14-ab013b176cef	Sarah Ochieng	sarah@nairobigarage.co.ke	$2b$10$mabxKOCwI46KtmjJDRlSiOraqT1n0cDAAIwe5CPITSXrKcHKVXuB6	owner	2026-03-07 07:22:28.467321
1c043cef-a241-4e55-b81a-ddcd1d56d122	Peter Kamau	peter@spareparts254.co.ke	$2b$10$mabxKOCwI46KtmjJDRlSiOraqT1n0cDAAIwe5CPITSXrKcHKVXuB6	owner	2026-03-07 07:22:28.471638
312ac309-4aac-4ba8-9dc5-a9f59737ac62	Grace Njeri	grace@shinewash.co.ke	$2b$10$mabxKOCwI46KtmjJDRlSiOraqT1n0cDAAIwe5CPITSXrKcHKVXuB6	owner	2026-03-07 07:22:28.474914
79be37d9-d79c-43ca-a2d1-e8e2636546a3	David Otieno	david@trustinsure.co.ke	$2b$10$mabxKOCwI46KtmjJDRlSiOraqT1n0cDAAIwe5CPITSXrKcHKVXuB6	owner	2026-03-07 07:22:28.478903
7a87854e-b793-4781-b1b9-9e39d565de47	Test Owner	testowner@test.com	$2b$10$d7Tm.BWJk0Zt2B3tsfQVh.Y0u4zdbuM4UZMgdcyQ/Wr5rCVTA4j7C	owner	2026-03-07 07:25:13.778555
\.


--
-- Name: business_reports business_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_reports
    ADD CONSTRAINT business_reports_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: cars cars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);


--
-- Name: garage_services garage_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garage_services
    ADD CONSTRAINT garage_services_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: spare_parts spare_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT spare_parts_pkey PRIMARY KEY (id);


--
-- Name: support_services support_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_services
    ADD CONSTRAINT support_services_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: business_reports business_reports_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_reports
    ADD CONSTRAINT business_reports_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: businesses businesses_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: cars cars_dealer_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_dealer_id_businesses_id_fk FOREIGN KEY (dealer_id) REFERENCES public.businesses(id);


--
-- Name: garage_services garage_services_garage_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garage_services
    ADD CONSTRAINT garage_services_garage_id_businesses_id_fk FOREIGN KEY (garage_id) REFERENCES public.businesses(id);


--
-- Name: messages messages_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: reviews reviews_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: spare_parts spare_parts_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT spare_parts_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: support_services support_services_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_services
    ADD CONSTRAINT support_services_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- PostgreSQL database dump complete
--

\unrestrict eWm3UMiAy5v8LddlQn18CHXfpnZAV6n8keh5KPUkO2UD0dSe3wxIwO2FttFffg8

