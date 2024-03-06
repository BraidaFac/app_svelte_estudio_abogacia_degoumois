<script lang="ts">
	import { enhance } from "$app/forms";
	import type { ActionData } from './$types';
    export let form:ActionData;

	 function validateOrThrow(formdata: FormData) {
		const obj = Object.fromEntries(formdata.entries());
        if(obj.name === "" || obj.password === ""){
            throw new Error("Email and password are required");
        }
	}
	 function manageError(error: any) {
		if (error instanceof Error) {
			form = { message: error.message} as ActionData;
		}
	}
</script>
<div class="w-1/3 mx-auto">
    <h1 class="text-4xl mb-10 text-center">Iniciar Sesion</h1>
    <form class="" method="POST" 
    use:enhance={({formData,cancel})=>{
      try { 
				validateOrThrow(formData);
			    return ({ update }) => {
						update();
						};
					} catch (error) {
                        cancel();
						manageError(error);
					}
    }}>
        <label>
        <span>Nombre</span>
        <input class="input"type="text" name="name" />
        </label>
        <label>
        <span>Password</span>
        <input class="input"type="password" name="password" />
        </label>
        {#if form?.message}
        <span class="text-red-600 block">{form?.message}</span>
        {/if}
        <button class="btn variant-filled-primary mt-3" type="submit">Login</button>
    </form>
</div>