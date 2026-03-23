import { describe, it, expectTypeOf } from 'vitest';
import { DeepReadonly, PickedByType, EventHandlers } from '../src/types';

declare global {
    interface HTMLElement {
        tagName: string;
    }
}

describe('DeepReadonly', () => {
    it('делает все свойства readonly', () => {
        type User = {
            id: number;
            name: string;
            address: {
                city: string;
                street: string;
            };
        };

        type ReadonlyUser = DeepReadonly<User>;
        
        expectTypeOf<ReadonlyUser>().toMatchTypeOf<{
            readonly id: number;
            readonly name: string;
            readonly address: {
                readonly city: string;
                readonly street: string;
            };
        }>();
    });

    it('работает с вложенными объектами', () => {
        type Complex = {
            a: number;
            b: {
                c: string;
                d: {
                    e: boolean;
                };
            };
        };

        type ReadonlyComplex = DeepReadonly<Complex>;
        
        expectTypeOf<ReadonlyComplex>().toMatchTypeOf<{
            readonly a: number;
            readonly b: {
                readonly c: string;
                readonly d: {
                    readonly e: boolean;
                };
            };
        }>();
    });

    it('работает с массивами', () => {
        type WithArray = {
            items: { id: number }[];
            name: string;
        };

        type ReadonlyWithArray = DeepReadonly<WithArray>;
        
        expectTypeOf<ReadonlyWithArray>().toMatchTypeOf<{
            readonly items: readonly { readonly id: number }[];
            readonly name: string;
        }>();
    });

    it('сохраняет примитивные типы', () => {
        type Primitive = {
            str: string;
            num: number;
            bool: boolean;
            nul: null;
            und: undefined;
        };

        type ReadonlyPrimitive = DeepReadonly<Primitive>;
        
        expectTypeOf<ReadonlyPrimitive>().toMatchTypeOf<{
            readonly str: string;
            readonly num: number;
            readonly bool: boolean;
            readonly nul: null;
            readonly und: undefined;
        }>();
    });
});

describe('PickedByType', () => {
    it('выбирает свойства типа string', () => {
        type Test = {
            name: string;
            age: number;
            city: string;
            active: boolean;
            email: string;
        };

        type StringProps = PickedByType<Test, string>;
        
        expectTypeOf<StringProps>().toMatchTypeOf<{
            name: string;
            city: string;
            email: string;
        }>();
    });

    it('выбирает свойства типа number', () => {
        type Test = {
            id: number;
            age: number;
            name: string;
            score: number;
        };

        type NumberProps = PickedByType<Test, number>;
        
        expectTypeOf<NumberProps>().toMatchTypeOf<{
            id: number;
            age: number;
            score: number;
        }>();
    });

    it('выбирает свойства типа boolean', () => {
        type Test = {
            isActive: boolean;
            isDeleted: boolean;
            name: string;
            age: number;
        };

        type BooleanProps = PickedByType<Test, boolean>;
        
        expectTypeOf<BooleanProps>().toMatchTypeOf<{
            isActive: boolean;
            isDeleted: boolean;
        }>();
    });

    it('работает с объектными типами', () => {
        type Address = {
            city: string;
            street: string;
        };

        type Test = {
            homeAddress: Address;
            workAddress: Address;
            name: string;
            age: number;
        };

        type AddressProps = PickedByType<Test, Address>;
        
        expectTypeOf<AddressProps>().toMatchTypeOf<{
            homeAddress: Address;
            workAddress: Address;
        }>();
    });

    it('возвращает пустой объект если нет свойств нужного типа', () => {
        type Test = {
            name: string;
            age: number;
        };

        type BooleanProps = PickedByType<Test, boolean>;
        
        expectTypeOf<BooleanProps>().toEqualTypeOf<{}>();
    });
});

describe('EventHandlers', () => {
    it('генерирует обработчики для событий', () => {
        type Events = {
            click: { x: number; y: number };
            hover: { element: HTMLElement };
            submit: { data: string };
        };

        type Handlers = EventHandlers<Events>;
        
        expectTypeOf<Handlers>().toMatchTypeOf<{
            onClick: (event: { x: number; y: number }) => void;
            onHover: (event: { element: HTMLElement }) => void;
            onSubmit: (event: { data: string }) => void;
        }>();
    });

    it('работает с простыми типами событий', () => {
        type Events = {
            start: void;
            end: void;
            error: string;
        };

        type Handlers = EventHandlers<Events>;
        
        expectTypeOf<Handlers>().toMatchTypeOf<{
            onStart: (event: void) => void;
            onEnd: (event: void) => void;
            onError: (event: string) => void;
        }>();
    });

    it('работает с несколькими событиями', () => {
        type Events = {
            load: { url: string };
            error: { code: number; message: string };
            progress: number;
        };

        type Handlers = EventHandlers<Events>;
        
        expectTypeOf<Handlers>().toMatchTypeOf<{
            onLoad: (event: { url: string }) => void;
            onError: (event: { code: number; message: string }) => void;
            onProgress: (event: number) => void;
        }>();
    });

    it('правильно форматирует имена обработчиков', () => {
        type Events = {
            click: void;
            doubleClick: void;
            mouseEnter: void;
            keyDown: void;
        };

        type Handlers = EventHandlers<Events>;
        
        expectTypeOf<Handlers>().toMatchTypeOf<{
            onClick: (event: void) => void;
            onDoubleClick: (event: void) => void;
            onMouseEnter: (event: void) => void;
            onKeyDown: (event: void) => void;
        }>();
    });

    it('работает с пустым объектом', () => {
        type EmptyEvents = {};
        type Handlers = EventHandlers<EmptyEvents>;
        
        expectTypeOf<Handlers>().toEqualTypeOf<{}>();
    });
});