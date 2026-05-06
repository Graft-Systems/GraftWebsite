from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes


class ToolsDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"ok": True, "page": "toolsdashboard", "user": request.user.username})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_disabled(request):
    # Registration is disabled for now.
    return Response({"error": "Registration is disabled."}, status=403)
