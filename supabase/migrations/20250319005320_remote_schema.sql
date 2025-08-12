create table "public"."asset_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "asset_id" text not null,
    "asset_name" text not null,
    "asset_symbol" text not null,
    "asset_icon" text not null,
    "report_times" text[] not null,
    "report_days" text not null default 'daily'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_report_sent" timestamp with time zone
);


alter table "public"."asset_subscriptions" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "first_name" text not null,
    "last_name" text not null,
    "email" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "subscription_tier_id" uuid
);


alter table "public"."profiles" enable row level security;

create table "public"."tiers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "price" numeric not null,
    "max_assets" integer not null,
    "max_reports_per_day" integer not null,
    "additional_asset_price" numeric not null,
    "additional_report_price" numeric,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."tiers" enable row level security;

CREATE UNIQUE INDEX asset_subscriptions_pkey ON public.asset_subscriptions USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX tiers_name_key ON public.tiers USING btree (name);

CREATE UNIQUE INDEX tiers_pkey ON public.tiers USING btree (id);

alter table "public"."asset_subscriptions" add constraint "asset_subscriptions_pkey" PRIMARY KEY using index "asset_subscriptions_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."tiers" add constraint "tiers_pkey" PRIMARY KEY using index "tiers_pkey";

alter table "public"."asset_subscriptions" add constraint "asset_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."asset_subscriptions" validate constraint "asset_subscriptions_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_subscription_tier_id_fkey" FOREIGN KEY (subscription_tier_id) REFERENCES tiers(id) not valid;

alter table "public"."profiles" validate constraint "profiles_subscription_tier_id_fkey";

alter table "public"."tiers" add constraint "tiers_name_key" UNIQUE using index "tiers_name_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    NEW.email
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$function$
;

grant delete on table "public"."asset_subscriptions" to "anon";

grant insert on table "public"."asset_subscriptions" to "anon";

grant references on table "public"."asset_subscriptions" to "anon";

grant select on table "public"."asset_subscriptions" to "anon";

grant trigger on table "public"."asset_subscriptions" to "anon";

grant truncate on table "public"."asset_subscriptions" to "anon";

grant update on table "public"."asset_subscriptions" to "anon";

grant delete on table "public"."asset_subscriptions" to "authenticated";

grant insert on table "public"."asset_subscriptions" to "authenticated";

grant references on table "public"."asset_subscriptions" to "authenticated";

grant select on table "public"."asset_subscriptions" to "authenticated";

grant trigger on table "public"."asset_subscriptions" to "authenticated";

grant truncate on table "public"."asset_subscriptions" to "authenticated";

grant update on table "public"."asset_subscriptions" to "authenticated";

grant delete on table "public"."asset_subscriptions" to "service_role";

grant insert on table "public"."asset_subscriptions" to "service_role";

grant references on table "public"."asset_subscriptions" to "service_role";

grant select on table "public"."asset_subscriptions" to "service_role";

grant trigger on table "public"."asset_subscriptions" to "service_role";

grant truncate on table "public"."asset_subscriptions" to "service_role";

grant update on table "public"."asset_subscriptions" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."tiers" to "anon";

grant insert on table "public"."tiers" to "anon";

grant references on table "public"."tiers" to "anon";

grant select on table "public"."tiers" to "anon";

grant trigger on table "public"."tiers" to "anon";

grant truncate on table "public"."tiers" to "anon";

grant update on table "public"."tiers" to "anon";

grant delete on table "public"."tiers" to "authenticated";

grant insert on table "public"."tiers" to "authenticated";

grant references on table "public"."tiers" to "authenticated";

grant select on table "public"."tiers" to "authenticated";

grant trigger on table "public"."tiers" to "authenticated";

grant truncate on table "public"."tiers" to "authenticated";

grant update on table "public"."tiers" to "authenticated";

grant delete on table "public"."tiers" to "service_role";

grant insert on table "public"."tiers" to "service_role";

grant references on table "public"."tiers" to "service_role";

grant select on table "public"."tiers" to "service_role";

grant trigger on table "public"."tiers" to "service_role";

grant truncate on table "public"."tiers" to "service_role";

grant update on table "public"."tiers" to "service_role";

create policy "Users can delete their own asset subscriptions"
on "public"."asset_subscriptions"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own asset subscriptions"
on "public"."asset_subscriptions"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own asset subscriptions"
on "public"."asset_subscriptions"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own asset subscriptions"
on "public"."asset_subscriptions"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view their own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Anyone can read tiers"
on "public"."tiers"
as permissive
for select
to public
using (true);


CREATE TRIGGER update_asset_subscriptions_updated_at BEFORE UPDATE ON public.asset_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiers_updated_at BEFORE UPDATE ON public.tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


