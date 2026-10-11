import asyncio
import time
from enum import Enum
from pathlib import Path
from typer_injector import InjectingTyper
from pymobiledevice3.cli.cli_common import ServiceProviderDep, async_command
from pymobiledevice3.services.dvt.instruments.dvt_provider import DvtProvider
from pymobiledevice3.services.dvt.instruments.condition_inducer import ConditionInducer

class Profile(str, Enum):
    loss = 'SlowNetwork100PctLoss'
    poor = 'SlowNetworkVeryBadNetwork'

cli = InjectingTyper()

@cli.command()
@async_command
async def run(service_provider: ServiceProviderDep, profile: Profile, seconds: int = 1200):
    if not 1 <= seconds <= 1800:
        raise ValueError('Condition must be bounded to 1..1800 seconds')
    stop = Path('/private/tmp/kivilo-network-condition.stop')
    if stop.exists():
        raise RuntimeError('Remove the previous stop marker before starting a new condition')
    async with DvtProvider(service_provider) as dvt, ConditionInducer(dvt) as condition:
        before = await condition.list()
        if any(group.get('isActive') for group in before):
            raise RuntimeError('An existing device condition is active; leaving it unchanged')
        try:
            await condition.set(profile.value)
            active = await condition.list()
            matches = [g for g in active if g.get('identifier') == 'SlowNetworkCondition']
            if len(matches) != 1 or not matches[0].get('isActive') or matches[0].get('activeProfile') != profile.value:
                raise RuntimeError('Network condition did not read back as requested')
            print(f'ACTIVE {profile.value}; automatic restore in {seconds}s', flush=True)
            deadline = time.monotonic() + seconds
            while time.monotonic() < deadline and not stop.exists():
                await asyncio.sleep(1)
        finally:
            await asyncio.wait_for(condition.clear(), timeout=20)
            restored = await asyncio.wait_for(condition.list(), timeout=20)
            if any(group.get('isActive') for group in restored):
                raise RuntimeError('Condition cleanup did not read back as inactive')
            print('RESTORED all induced conditions inactive', flush=True)

if __name__ == '__main__':
    cli()
