<script lang="ts">
  import { registerSchema } from "./registerSchema";
  import {ZodError} from "zod";
  import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	let loading = false;
  export let form:ActionData;

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
<div class="w-1/2 mx-auto">
    <form method="POST" use:enhance={({formData,cancel})=>{
      try {
            loading = true;
						validateOrThrow(formData);
						return ({ update }) => {
							loading = false;
							update();
						};
					} catch (error) {
            cancel();
						manageError(error);
					}
    }}>
        <label class="label">
            <span>Nombre</span>
            <input class="input" type="text" placeholder="Nombre" name="name"/> 
            {#if form?.errors && form?.errors['name']}
            <span class="text-red-600">{form?.errors['name']}</span>
            {/if}
        </label> 
          <label class="label">
            <span>Password</span>
            <input class="input" type="password" placeholder="Password" name="password" />
            {#if form?.errors && form?.errors['password']}
            <span class="text-red-600">{form?.errors['password']}</span>
            {/if}
        </label>
          <label class="label">
            <span>Confirmar Password</span>
            <input class="input" type="password" placeholder="Confirmar Password" name="confirmPassword"/>
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
        <button type="submit" class="btn variant-filled-primary">Registrarse</button>
    </form>
</div>