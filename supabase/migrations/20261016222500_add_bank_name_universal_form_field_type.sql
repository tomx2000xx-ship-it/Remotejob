alter table public.form_fields drop constraint if exists form_fields_field_type_check;

alter table public.form_fields add constraint form_fields_field_type_check check (
  field_type = any (array[
    'text','textarea','email','tel','url','password','number',
    'coupon_number','verification_code_3','date','month_year','time',
    'datetime-local','select','radio','checkbox','file','country','bank_name'
  ]::text[])
);
