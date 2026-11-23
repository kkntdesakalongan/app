<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearIdentity, refreshIdentity } from '@/framework/identity'
import Logo from '@/assets/corporate/common/Logo.vue'
import config from '@/config'
import { resolvePostLoginRoute } from '@/router/navigation'
import { consumePostLoginRedirect } from '@/utils/post-login-redirect'
import Card from '@southneuhof/loom/components/base/Card.vue'
import Toast from '@southneuhof/loom/components/base/Toast.vue'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import Spinner from '@southneuhof/loom/components/base/Spinner.vue'
import TextInput from '@southneuhof/loom/components/inputs/TextInput.vue'
import PasswordInput from '@southneuhof/loom/components/inputs/PasswordInput.vue'
import { rpc } from '@/framework/rpc'

const loginMessage = ref<{ message: string; type: 'error' | 'warning' | 'info' | 'success' | undefined }>({ message: '', type: undefined })
const router = useRouter()
const loading = ref(false)
const formData = ref({ email: '', password: '' })

const INVALID_CREDENTIALS_MESSAGE = 'Email atau password tidak valid'
const CONNECTION_ERROR_MESSAGE = 'Tidak dapat terhubung ke server. Silakan coba lagi'
const PERMISSION_ERROR_MESSAGE = 'Gagal memuat akses aplikasi. Silakan coba lagi'
const NO_DESTINATION_MESSAGE = 'Tidak ada halaman yang dapat diakses oleh akun ini'

function clearStagedAccess() {
  clearIdentity()
}

async function rejectLogin(message: string, sessionEstablished: boolean, clearAccess = false) {
  if (clearAccess) clearStagedAccess()
  if (sessionEstablished) {
    try {
      await rpc.auth['sign-out'].$post({ json: {} })
    } catch (_) {}
  }
  loginMessage.value = { message, type: 'error' }
}

async function login() {
  loading.value = true
  loginMessage.value = { message: '', type: undefined }
  let sessionEstablished = false
  let failureStage: 'sign-in' | 'identity' = 'sign-in'
  try {
    const loginResponse = await rpc.auth['sign-in'].email.$post({ json: formData.value })
    if (!loginResponse.ok) {
      await rejectLogin(INVALID_CREDENTIALS_MESSAGE, false)
      return
    }

    const loginData = await loginResponse.json()
    if (!loginData?.user) {
      await rejectLogin(INVALID_CREDENTIALS_MESSAGE, false)
      return
    }

    sessionEstablished = true
    failureStage = 'identity'
    const identity = await refreshIdentity()
    if (!identity) {
      await rejectLogin(PERMISSION_ERROR_MESSAGE, sessionEstablished, true)
      return
    }

    const destination = resolvePostLoginRoute(router, consumePostLoginRedirect())
    if (!destination) {
      await rejectLogin(NO_DESTINATION_MESSAGE, sessionEstablished, true)
      return
    }

    await router.push(destination)
  } catch (_) {
    await rejectLogin(failureStage === 'identity' ? PERMISSION_ERROR_MESSAGE : CONNECTION_ERROR_MESSAGE, sessionEstablished, failureStage === 'identity')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Card class="mx-auto flex w-full max-w-md flex-col gap-5 p-5 sm:gap-6 sm:p-8">
    <div class="flex items-center justify-between gap-3">
      <Logo class="w-12 shrink-0" />
      <Button variant="text" href="/map" class="min-h-11 px-2">
        <template #icon
          ><span aria-hidden="true"><Icon name="map-2" /></span
        ></template>
        Peta
      </Button>
    </div>
    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ config.name }}</h1>
    <form class="login-form flex flex-col gap-4" @submit.prevent="login">
      <TextInput :model-value="formData.email" @update:model-value="(value) => (formData.email = String(value))" type="email" name="email" autocomplete="username" label="Email" required />
      <PasswordInput :model-value="formData.password" @update:model-value="(value) => (formData.password = String(value))" name="password" autocomplete="current-password" label="Password" required />
      <Toast v-if="loginMessage.message" :type="loginMessage.type">{{ loginMessage.message }}</Toast>
      <Button :disabled="loading" type="submit" class="min-h-11 w-full">
        <Spinner v-if="loading" />
        <template v-else>Login</template>
      </Button>
    </form>
  </Card>
</template>

<style scoped>
.login-form :deep(input) {
  font-size: 1rem;
}
</style>
