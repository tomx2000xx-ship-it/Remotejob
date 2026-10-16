ALTER TABLE public.form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;

ALTER TABLE public.form_fields
  ADD CONSTRAINT form_fields_field_type_check
  CHECK (field_type = ANY (ARRAY[
    'text', 'textarea', 'email', 'tel', 'url', 'password', 'number',
    'coupon_number', 'verification_code_3', 'date', 'month_year', 'time',
    'datetime-local', 'select', 'radio', 'checkbox', 'file', 'country',
    'bank_name', 'mixed_text'
  ]::text[]));
