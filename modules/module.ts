import {
    PreHook,
    CreateHook,
    UpdateHook,
    DestroyHook,
    RemoveHook,
    PostHook
} from '../src/hooks'

export type Module = Partial<{
    pre: PreHook;
    create: CreateHook,
    update: UpdateHook,
    destory: DestroyHook,
    remove: RemoveHook,
    post: PostHook
}>