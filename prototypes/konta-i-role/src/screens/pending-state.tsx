import { SimNote } from "../gaps/sim-note";

/** Stan z mapy, który powstanie w kolejnym etapie prototypu — jawnie, zamiast pustego ekranu. */
export function PendingState({ stateId }: { stateId: string }) {
  return <SimNote>stan {stateId} z mapy ekranów powstanie w etapie 2 prototypu.</SimNote>;
}
