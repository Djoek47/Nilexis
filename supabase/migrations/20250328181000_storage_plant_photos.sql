-- Storage bucket for daily plant photos (path: {user_id}/{plant_id}/{filename})

insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', false)
on conflict (id) do nothing;

create policy plant_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy plant_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy plant_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy plant_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);
