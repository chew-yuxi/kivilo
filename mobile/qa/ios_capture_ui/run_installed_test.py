from enum import Enum
from typer_injector import InjectingTyper
from pymobiledevice3.cli.cli_common import ServiceProviderDep, async_command
from pymobiledevice3.services.dvt.testmanaged.xcuitest import TestConfig, XCUITestService, XCUITestListener

class Step(str, Enum):
    launch = 'testInstalledKiviloLaunches'
    fixture = 'testOpenExactSyntheticCamera'
    offline_fixture = 'testOpenExactSyntheticCameraOffline'
    capture = 'testThirtyPhotosAndTenMinuteVideo'
    photos = 'testThirtyPhotosInExactSyntheticRoom'
    microphone = 'testApproveMicrophoneForExactSyntheticRoom'
    one_photo = 'testOnePhotoInExactSyntheticRoom'
    video = 'testTenMinuteVideoInExactSyntheticRoom'
    restart = 'testSyntheticCaptureSurvivesOfflineRestart'

class Results(XCUITestListener):
    def __init__(self):
        self.finished = []
        self.failures = 0
    async def test_case_did_start(self, test_class, method):
        print(f'START {test_class}/{method}', flush=True)
    async def test_case_did_finish(self, result):
        self.finished.append(result)
        print(f'FINISH {result.test_class}/{result.method} status={result.status} duration={result.duration:.1f}', flush=True)
    async def test_case_did_fail(self, test_class, method, message, file, line):
        self.failures += 1
        print(f'FAIL {test_class}/{method}: {message}', flush=True)
    async def log_message(self, message):
        if 'QA ' in message:
            print(message.strip(), flush=True)

cli = InjectingTyper()

@cli.command()
@async_command
async def run(service_provider: ServiceProviderDep, step: Step):
    cfg = await TestConfig.create_for(service_provider, 'one.kivilo.qa.capturetests.xctrunner')
    cfg.tests_to_run = [f'KiviloCaptureUITests/{step.value}']
    cfg.runner_app_env = {'KIVILO_SYNTHETIC_CAPTURE_QA': '1'}
    results = Results()
    await XCUITestService(service_provider).run(
        cfg,
        timeout=(1000 if step in (Step.capture, Step.video)
                 else 360 if step is Step.photos
                 else 240 if step is Step.restart else 90),
        listener=results,
    )
    if results.failures or len(results.finished) != 1 or results.finished[0].status != 'passed':
        raise RuntimeError('The selected XCTest did not finish with exactly one passing result')

if __name__ == '__main__':
    cli()
