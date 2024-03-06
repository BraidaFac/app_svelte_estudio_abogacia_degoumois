<script lang="ts">
  import { registerSchema } from "./registerSchema";
  import {ZodError} from "zod";
  import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
  import { ProgressRadial} from '@skeletonlabs/skeleton'
  import { page } from '$app/stores';
	import { invalidateAll } from "$app/navigation";
	let loading = false;
  export let form:ActionData;
  export let data = {users:[]};
  
  $:users = data.users;
  const currentUser = $page.data.user;
  
	 function validateOrThrow(formdata: FormData) {
		const obj = Object.fromEntries(formdata.entries());
    registerSchema.parse(obj);
		
	}

	 function manageError(error: any) {
		if (error instanceof ZodError) {
			const { fieldErrors } = error.flatten();
			form = { errors: fieldErrors } as ActionData;
      
		}
	}
  
</script>
<div class="flex w-full mt-10 justify-center">
  <div class="flex justify-center w-1/2">
    {#if loading}
        <ProgressRadial class="mt-20 w-14 h-14"/>
    {:else}
    <form method="POST" action="?/create" use:enhance={({formData,cancel})=>{
      try {
            loading = true;
						validateOrThrow(formData);
						return ({ update }) => {
							loading = false;
							update();
              invalidateAll();
						};
					} catch (error) {
            cancel();
						manageError(error);
					}
    }} class="w-3/4">
        <label class="label">
            <span>Nombre y Apellido</span>
            <input  autocomplete="off" autosave="off" class="input" type="text" placeholder="Nombre" name="name"/> 
            {#if form?.errors && form?.errors['name']}
            <span class="text-red-600">{form?.errors['name']}</span>
            {/if}
        </label> 
          <label class="label">
            <span>Password</span>
            <input  autocomplete="off"  autosave="off" class="input" type="password" placeholder="Password" name="password" />
            {#if form?.errors && form?.errors['password']}
            <span class="text-red-600">{form?.errors['password']}</span>
            {/if}
        </label>
          <label class="label">
            <span>Confirmar Password</span>
            <input autocomplete="off"  autosave="off"  class="input" type="password" placeholder="Confirmar Password" name="confirmPassword"/>
            {#if form?.errors && form?.errors['confirmPassword']}
            <span class="text-red-600">{form?.errors['confirmPassword'][0]}</span>
            {/if}
            {#if form?.errors && form?.errors['confirmPassword'] && form?.errors['confirmPassword'][1]}
            <span class="text-red-600 block">{form?.errors['confirmPassword'][1]}</span>
            {/if}
        </label>
        {#if form?.message}
        <span class="text-red-600 block">{form.message}</span>
        {/if}
        <button type="submit" class="btn variant-filled-primary mt-4">Guardar</button>
    </form>
    {/if}
  </div>
    <div class="w-1/2 px-3">
      <h1 class="text-center text-4xl mb-3 ">Usuarios</h1>
        <table class="table ">
          <thead class="bg-gray-50">
            <tr>
              <th >Nombre</th>
              <th >Rol</th>
              <th >Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#if users?.length == 0}
            <tr>
              <td class="" colspan="3">No hay usuarios</td>
            </tr>
            {:else}
            {#each users as user}
            <tr>
              <td>{user.name}</td>
              <td>{user.role}</td>
              <td> {#if user.id !== currentUser.id}
                <form method="POST" action="?/delete" use:enhance={({})=>{
						    return ({ update,result }) => {
                      if(result.status === 200){
                      invalidateAll();}
                }}}>
                  <input hidden type="text" name="id" value="{user.id}"/>
                  <button class="btn variant-filled-primary h-6">Eliminar</button>
                </form>
                {/if}
              </td>
            </tr>
            {/each}
            {/if}
          </tbody>
          </table>
    </div>
</div>