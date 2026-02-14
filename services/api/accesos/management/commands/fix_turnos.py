from django.core.management.base import BaseCommand
from django.utils import timezone
from accesos.models import Turno

class Command(BaseCommand):
    help = "Audita y corrige turnos inconsistentes (fin < inicio, activo/fin incoherente)"

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Aplica correcciones")

    def handle(self, *args, **options):
        apply = options["apply"]
        now = timezone.now()

        qs = Turno.objects.all()
        total = qs.count()

        bad = 0
        fixed = 0

        for t in qs.iterator():
            changed = False

            # fin < inicio
            if t.fin is not None and t.inicio is not None and t.fin < t.inicio:
                bad += 1
                if apply:
                    t.fin = t.inicio
                    changed = True

            # activo=True pero fin existe
            if t.activo and t.fin is not None:
                bad += 1
                if apply:
                    t.activo = False
                    changed = True

            # activo=False pero fin es NULL
            if (not t.activo) and (t.fin is None):
                bad += 1
                if apply:
                    t.fin = now
                    changed = True

            if apply and changed:
                t.save(update_fields=["activo", "fin"])
                fixed += 1

        self.stdout.write(self.style.WARNING(f"Total turnos: {total}"))
        self.stdout.write(self.style.WARNING(f"Inconsistentes detectados: {bad}"))
        if apply:
            self.stdout.write(self.style.SUCCESS(f"Registros corregidos: {fixed}"))
        else:
            self.stdout.write("DRY-RUN: ejecuta con --apply para corregir")
